import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Invoice } from '../../models/invoice';

@Component({
  selector: 'app-invoice-preview',
  templateUrl: './invoice-preview.component.html',
  styleUrls: ['./invoice-preview.component.css']
})
export class InvoicePreviewComponent {
  @Input() invoice: Invoice | null = null;
  @Input() showPreview: boolean = false;
  @Output() close = new EventEmitter<void>();

  async generatePDF(): Promise<void> {
    if (!this.invoice) return;

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;

      pdf.setFontSize(20);
      pdf.setTextColor(33, 150, 243);
      pdf.text('MC Computers', 20, yPosition);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      yPosition += 6;
      pdf.text('123 Tech Avenue, Colombo 07, Sri Lanka', 20, yPosition);
      yPosition += 6;
      pdf.text('+94 11 234 5678 | info@mcccomputers.lk', 20, yPosition);

      pdf.setFontSize(24);
      pdf.setTextColor(33, 150, 243);
      pdf.text('INVOICE', 160, 30);

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      yPosition += 20;
      pdf.text(`Invoice No: ${this.invoice.invoiceNumber}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Date: ${new Date(this.invoice.invoiceDate).toLocaleDateString()}`, 20, yPosition);

      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setTextColor(33, 150, 243);
      pdf.text('BILLED TO:', 20, yPosition);

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;
      pdf.text(this.invoice.customer.name, 20, yPosition);
      yPosition += 6;
      pdf.text(this.invoice.customer.phone, 20, yPosition);
      if (this.invoice.customer.email) {
        yPosition += 6;
        pdf.text(this.invoice.customer.email, 20, yPosition);
      }
      if (this.invoice.customer.address) {
        yPosition += 6;
        const addressLines = this.splitText(this.invoice.customer.address, 50);
        addressLines.forEach(line => {
          pdf.text(line, 20, yPosition);
          yPosition += 6;
        });
      }

      yPosition += 10;
      this.addTableHeader(pdf, yPosition);
      yPosition += 10;

      this.invoice.items.forEach((item) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
          this.addTableHeader(pdf, yPosition);
          yPosition += 10;
        }

        pdf.text(item.productName, 20, yPosition);
        pdf.text(item.description, 60, yPosition);
        pdf.text(item.quantity.toString(), 120, yPosition);
        pdf.text(`LKR ${item.price.toFixed(2)}`, 140, yPosition);
        pdf.text(`LKR ${item.amount.toFixed(2)}`, 170, yPosition);
        yPosition += 8;
      });

      yPosition += 10;
      pdf.setFontSize(12);
      pdf.text(`Subtotal: LKR ${this.invoice.subTotal.toFixed(2)}`, 140, yPosition);
      yPosition += 8;
      pdf.text(`Discount: -LKR ${this.invoice.discount.toFixed(2)}`, 140, yPosition);
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setTextColor(33, 150, 243);
      pdf.text(`Total: LKR ${this.invoice.total.toFixed(2)}`, 140, yPosition);

      yPosition += 20;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Thank you for your business!', 20, yPosition);
      yPosition += 5;
      pdf.text('Terms: Warranty covers manufacturing defects for 14 days.', 20, yPosition);

      pdf.save(`invoice-${this.invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
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

  printInvoice(): void {
    if (!this.invoice) return;
    const printContent = this.generatePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private generatePrintContent(): string {
    if (!this.invoice) return '';
    const itemsHtml = this.invoice.items.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>LKR ${item.price.toFixed(2)}</td>
        <td>LKR ${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
    <html>
      <head>
        <title>Invoice ${this.invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Invoice: ${this.invoice.invoiceNumber}</h2>
        <p><strong>Date:</strong> ${new Date(this.invoice.invoiceDate).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${this.invoice.customer.name}</p>
        <p><strong>Phone:</strong> ${this.invoice.customer.phone}</p>
        <p><strong>Email:</strong> ${this.invoice.customer.email}</p>
        <p><strong>Address:</strong> ${this.invoice.customer.address}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total">Total: LKR ${this.invoice.total.toFixed(2)}</div>
      </body>
    </html>`;
  }

  closePreview(): void {
    this.close.emit();
  }
}
