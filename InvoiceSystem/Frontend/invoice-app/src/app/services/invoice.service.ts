import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Invoice, InvoiceItem } from '../models/invoice';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:5137/api/invoices';

  constructor(private http: HttpClient) { }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(invoices => invoices.map(inv => this.mapInvoiceFromBackend(inv)))
    );
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(invoice => this.mapInvoiceFromBackend(invoice))
    );
  }

  createInvoice(invoice: Invoice): Observable<Invoice> {
    const payload = this.mapInvoiceToBackend(invoice);
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(created => this.mapInvoiceFromBackend(created))
    );
  }

  updateInvoice(id: number, invoice: Invoice): Observable<Invoice> {
    const payload = this.mapInvoiceToBackend(invoice);
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(updated => this.mapInvoiceFromBackend(updated))
    );
  }

  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // PDF Generation method that can be used from list component
  async generateInvoicePDF(invoice: Invoice): Promise<void> {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add logo to PDF
      await this.addLogoToPDF(pdf);

      let yPosition = 45;

      // Company Info
      pdf.setFontSize(16);
      pdf.setTextColor(33, 150, 243);
      pdf.text('MC Computers', 140, 30);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('123 Tech Avenue, Colombo 07', 140, 36);
      pdf.text('Sri Lanka', 140, 41);
      pdf.text('+94 11 234 5678 | info@mcccomputers.lk', 140, 46);

      // Invoice Title
      pdf.setFontSize(24);
      pdf.setTextColor(33, 150, 243);
      pdf.text('INVOICE', 20, 30);

      // Invoice Details
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      yPosition = 65;
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, 20, yPosition);
      pdf.text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, 20, yPosition + 8);

      // Customer Information
      yPosition += 25;
      pdf.setFontSize(14);
      pdf.setTextColor(33, 150, 243);
      pdf.text('BILLED TO:', 20, yPosition);

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;
      pdf.text(invoice.customer.name, 20, yPosition);
      yPosition += 6;
      pdf.text(invoice.customer.phone, 20, yPosition);
      if (invoice.customer.email) {
        yPosition += 6;
        pdf.text(invoice.customer.email, 20, yPosition);
      }
      if (invoice.customer.address) {
        yPosition += 6;
        const addressLines = this.splitText(invoice.customer.address, 50);
        addressLines.forEach(line => {
          pdf.text(line, 20, yPosition);
          yPosition += 6;
        });
      }

      // Items Table
      yPosition += 15;
      this.addTableHeader(pdf, yPosition);
      yPosition += 10;

      invoice.items.forEach((item) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
          this.addLogoToPDF(pdf, 20, 20, 30, 30);
          yPosition = 55;
          this.addTableHeader(pdf, yPosition);
          yPosition += 10;
        }

        const productLines = this.splitText(item.productName, 30);
        const descLines = this.splitText(item.description, 40);

        const maxLines = Math.max(productLines.length, descLines.length);

        for (let i = 0; i < maxLines; i++) {
          if (i === 0) {
            pdf.text(productLines[i] || '', 20, yPosition);
            pdf.text(descLines[i] || '', 60, yPosition);
            pdf.text(item.quantity.toString(), 120, yPosition);
            pdf.text(`LKR ${item.price.toFixed(2)}`, 140, yPosition);
            pdf.text(`LKR ${item.amount.toFixed(2)}`, 170, yPosition);
          } else {
            pdf.text(productLines[i] || '', 20, yPosition);
            pdf.text(descLines[i] || '', 60, yPosition);
          }
          yPosition += 6;
        }
        yPosition += 2;
      });

      // Totals
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.text(`Subtotal: LKR ${invoice.subTotal.toFixed(2)}`, 140, yPosition);
      yPosition += 8;
      if (invoice.discount > 0) {
        pdf.text(`Discount: -LKR ${invoice.discount.toFixed(2)}`, 140, yPosition);
        yPosition += 8;
      }
      pdf.setFontSize(14);
      pdf.setTextColor(33, 150, 243);
      pdf.text(`Total: LKR ${invoice.total.toFixed(2)}`, 140, yPosition);

      // Footer
      yPosition += 25;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Thank you for your business!', 20, yPosition);
      yPosition += 5;
      pdf.text('Terms: Payment due upon receipt. Warranty covers manufacturing defects for 14 days.', 20, yPosition);

      // Add footer logo
      const pageHeight = pdf.internal.pageSize.height;
      this.addLogoToPDF(pdf, 20, pageHeight - 20, 15, 15);

      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  private async addLogoToPDF(pdf: any, x: number = 20, y: number = 20, width: number = 40, height: number = 40): Promise<void> {
    try {
      const logoBase64 = await this.getLogoBase64();
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', x, y, width, height);
      }
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
  }

  private getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      fetch('/assets/images/logo.png')
        .then(response => {
          if (!response.ok) throw new Error('Logo not found');
          return response.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          const svg = `
            <svg width="100" height="40" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="40" fill="#2196f3" rx="5"/>
              <text x="50" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">MC COMPUTERS</text>
            </svg>
          `;
          resolve('data:image/svg+xml;base64,' + btoa(svg));
        });
    });
  }

  private addTableHeader(pdf: any, yPosition: number): void {
    pdf.setFillColor(33, 150, 243);
    pdf.rect(20, yPosition - 8, 170, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text('Product', 20, yPosition);
    pdf.text('Description', 60, yPosition);
    pdf.text('Qty', 120, yPosition);
    pdf.text('Price', 140, yPosition);
    pdf.text('Amount', 170, yPosition);
    pdf.setTextColor(0, 0, 0);
  }

  private splitText(text: string, maxLength: number): string[] {
    if (!text) return [''];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + word).length <= maxLength) {
        current += (current ? ' ' : '') + word;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private mapInvoiceFromBackend(backendInvoice: any): Invoice {
    console.log('Raw backend invoice:', backendInvoice); // Debug log

    // Handle both response formats - check for nested Customer object first, then flat properties
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';
    let customerAddress = '';

    if (backendInvoice.customer) {
      // Has nested customer object
      customerName = backendInvoice.customer.name || backendInvoice.customer.Name || '';
      customerEmail = backendInvoice.customer.email || backendInvoice.customer.Email || '';
      customerPhone = backendInvoice.customer.phone || backendInvoice.customer.Phone || '';
      customerAddress = backendInvoice.customer.address || backendInvoice.customer.Address || '';
    } else {
      // Has flat properties
      customerName = backendInvoice.customerName || backendInvoice.CustomerName || '';
      customerEmail = backendInvoice.customerEmail || backendInvoice.CustomerEmail || '';
      customerPhone = backendInvoice.customerPhone || backendInvoice.CustomerPhone || '';
      customerAddress = backendInvoice.customerAddress || backendInvoice.CustomerAddress || '';
    }

    const items: InvoiceItem[] = backendInvoice.items ? backendInvoice.items.map((item: any) => ({
      id: item.id || 0,
      productId: item.productId || item.ProductId || 0,
      productName: item.productName || item.ProductName || '',
      description: item.description || item.Description || '',
      quantity: item.quantity || item.Quantity || 0,
      price: item.price || item.Price || 0,
      amount: item.amount || item.Amount || (item.quantity * item.price) || 0
    })) : [];

    const subTotal = backendInvoice.subTotal || backendInvoice.SubTotal || this.calculateSubTotal(items);
    const discount = backendInvoice.discount || backendInvoice.Discount || 0;
    const total = backendInvoice.total || backendInvoice.Total || (subTotal - discount);

    const mappedInvoice: Invoice = {
      id: backendInvoice.id || 0,
      invoiceNumber: backendInvoice.invoiceNumber || backendInvoice.InvoiceNumber || `INV-${backendInvoice.id || '0000'}`,
      invoiceDate: backendInvoice.invoiceDate ? new Date(backendInvoice.invoiceDate) : new Date(),
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress
      },
      items: items,
      subTotal: subTotal,
      discount: discount,
      total: total
    };

    console.log('Mapped invoice:', mappedInvoice); // Debug log
    return mappedInvoice;
  }

  private mapInvoiceToBackend(invoice: Invoice): any {
    return {
      CustomerName: invoice.customer.name,
      CustomerEmail: invoice.customer.email,
      CustomerPhone: invoice.customer.phone,
      CustomerAddress: invoice.customer.address,
      Discount: invoice.discount,
      Items: invoice.items.map(item => ({
        ProductId: item.productId,
        ProductName: item.productName,
        Description: item.description,
        Quantity: item.quantity,
        Price: item.price
      }))
    };
  }

  private calculateSubTotal(items: InvoiceItem[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }

  private calculateTotal(invoice: any): number {
    const subTotal = invoice.subTotal || this.calculateSubTotal(invoice.items);
    const discount = invoice.discount || 0;
    return subTotal - discount;
  }
}
