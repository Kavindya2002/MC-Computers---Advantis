import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { Product, Invoice, InvoiceItem } from '../../models/invoice';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css']
})
export class InvoiceFormComponent implements OnInit {
  products: Product[] = [];
  invoice: Invoice;
  selectedProductId: number = 0;
  selectedQuantity: number = 1;
  isLoading: boolean = false;
  showPreview: boolean = false;

  constructor(private invoiceService: InvoiceService, private router: Router) {
    this.invoice = this.createEmptyInvoice();
  }

  ngOnInit(): void {
    this.loadProducts();
    this.generateInvoiceNumber();
  }

  loadProducts(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.products = [
        { id: 1, name: "Laptop Dell XPS 13", description: "13-inch, 16GB RAM, 512GB SSD", price: 1299.99 },
        { id: 2, name: "MacBook Pro 14", description: "14-inch Apple laptop, M3 chip, 16GB RAM", price: 1999.99 },
        { id: 3, name: "Gaming PC", description: "Intel i7, RTX 4070, 32GB RAM, 1TB SSD", price: 1599.99 },
        { id: 4, name: "Wireless Mouse", description: "Ergonomic wireless mouse with RGB lighting", price: 29.99 },
        { id: 5, name: "Mechanical Keyboard", description: "RGB mechanical keyboard with blue switches", price: 89.99 }
      ];
      this.isLoading = false;
    }, 1000);
  }

  generateInvoiceNumber(): void {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    this.invoice.invoiceNumber = `INV-${timestamp}-${random}`;
  }

  createEmptyInvoice(): Invoice {
    return {
      id: 0,
      invoiceNumber: '',
      invoiceDate: new Date(),
      customer: { name: '', email: '', address: '', phone: '' },
      items: [],
      subTotal: 0,
      discount: 0,
      total: 0
    };
  }

  addProduct(): void {
    const product = this.products.find(p => p.id === Number(this.selectedProductId));
    if (!product) return;

    const existingIndex = this.invoice.items.findIndex(i => i.productId === product.id);
    if (existingIndex > -1) {
      this.invoice.items[existingIndex].quantity += this.selectedQuantity;
      this.invoice.items[existingIndex].amount =
        this.invoice.items[existingIndex].quantity * this.invoice.items[existingIndex].price;
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        productName: product.name,
        description: product.description,
        quantity: this.selectedQuantity,
        price: product.price,
        amount: product.price * this.selectedQuantity
      };
      this.invoice.items.push(newItem);
    }

    this.updateTotals();
    this.selectedProductId = 0;
    this.selectedQuantity = 1;
  }

  removeItem(index: number): void {
    this.invoice.items.splice(index, 1);
    this.updateTotals();
  }

  updateItemAmount(index: number): void {
    const item = this.invoice.items[index];
    if (item.quantity < 1) item.quantity = 1;
    item.amount = item.quantity * item.price;
    this.updateTotals();
  }

  updateTotal(): void {
    if (this.invoice.discount < 0) this.invoice.discount = 0;
    if (this.invoice.discount > this.invoice.subTotal) this.invoice.discount = this.invoice.subTotal;
    this.invoice.total = this.invoice.subTotal - this.invoice.discount;
  }

  updateTotals(): void {
    this.invoice.subTotal = this.invoice.items.reduce((sum, item) => sum + item.amount, 0);
    this.updateTotal();
  }

  resetForm(): void {
    this.invoice = this.createEmptyInvoice();
    this.generateInvoiceNumber();
    this.selectedProductId = 0;
    this.selectedQuantity = 1;
  }

  showInvoicePreview(): void {
    if (this.invoice.items.length === 0) {
      alert('Please add at least one product');
      return;
    }

    if (!this.invoice.customer.name || !this.invoice.customer.phone) {
      alert('Please fill in all required customer details');
      return;
    }

    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
  }

  onSubmit(): void {
    if (this.invoice.items.length === 0) {
      alert('Please add at least one product');
      return;
    }

    if (!this.invoice.customer.name || !this.invoice.customer.phone) {
      alert('Please fill in all required customer details');
      return;
    }

    this.isLoading = true;
    this.invoiceService.createInvoice(this.invoice).subscribe({
      next: (createdInvoice: Invoice) => {
        this.isLoading = false;
        this.showPreview = false;
        alert('Invoice created successfully!');
        this.router.navigate(['/invoices']);
      },
      error: (err) => {
        console.error('Error creating invoice', err);
        alert('Error creating invoice. Please try again.');
        this.isLoading = false;
      }
    });
  }

  downloadCurrentInvoicePDF(): void {
    this.downloadPDF(this.invoice);
  }

  async downloadPDF(invoice: Invoice): Promise<void> {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add logo to PDF
      await this.addLogoToPDF(pdf);

      let yPosition = 45; // Start below the logo

      // Company Info (right aligned)
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
          // Add logo on new page too
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
      alert('Error generating PDF. Please try again.');
    }
  }

  private async addLogoToPDF(pdf: any, x: number = 20, y: number = 20, width: number = 40, height: number = 40): Promise<void> {
    try {
      // Convert logo image to base64 (you can also use a direct URL)
      const logoBase64 = await this.getLogoBase64();

      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', x, y, width, height);
      }
    } catch (error) {
      console.warn('Could not load logo, continuing without it:', error);
    }
  }

  private getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Method 1: Using fetch to get the logo from assets
      fetch('/assets/images/logo.png')
        .then(response => {
          if (!response.ok) {
            throw new Error('Logo not found');
          }
          return response.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.warn('Logo not found in assets, using fallback:', error);
          // Method 2: Create a simple fallback logo
          resolve(this.createFallbackLogo());
        });
    });
  }

  private createFallbackLogo(): string {
    // Create a simple SVG logo as fallback
    const svg = `
      <svg width="100" height="40" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="40" fill="#2196f3" rx="5"/>
        <text x="50" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">MC COMPUTERS</text>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
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
}
