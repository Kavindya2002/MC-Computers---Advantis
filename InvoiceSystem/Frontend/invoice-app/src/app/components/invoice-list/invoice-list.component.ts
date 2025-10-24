import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice } from '../../models/invoice';

@Component({
  selector: 'app-invoice-list',
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.css']
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  selectedInvoice: Invoice | null = null;
  showInvoiceModal: boolean = false;
  searchTerm: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private invoiceService: InvoiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.invoiceService.getInvoices().subscribe({
      next: (invoices: Invoice[]) => {
        console.log('✅ Successfully loaded invoices:', invoices);
        this.invoices = invoices;
        this.filteredInvoices = [...this.invoices];
        this.loading = false;

        // Debug: Check if data is properly mapped
        if (this.invoices.length > 0) {
          console.log('📊 First invoice details:', this.invoices[0]);
          console.log('👤 Customer name:', this.invoices[0].customer.name);
          console.log('📧 Customer email:', this.invoices[0].customer.email);
          console.log('📞 Customer phone:', this.invoices[0].customer.phone);
          console.log('🏠 Customer address:', this.invoices[0].customer.address);
          console.log('🛒 Items count:', this.invoices[0].items.length);
        }
      },
      error: (err) => {
        console.error('❌ Error loading invoices', err);
        this.errorMessage = `Failed to load invoices: ${err.message}. Please check if the server is running.`;
        this.loading = false;

        // Fallback: Load sample data if server is not available
        this.loadSampleData();
      }
    });
  }

  private loadSampleData(): void {
    console.log('🔄 Loading sample data...');
    this.invoices = [
      {
        id: 1,
        invoiceNumber: 'INV-20240115143045999',
        invoiceDate: new Date('2024-01-15T14:30:45'),
        customer: {
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main St, New York, NY 10001'
        },
        items: [
          {
            id: 1,
            productId: 1,
            productName: 'Laptop Dell XPS 13',
            description: '13-inch, 16GB RAM, 512GB SSD',
            quantity: 1,
            price: 1299.99,
            amount: 1299.99
          },
          {
            id: 2,
            productId: 4,
            productName: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse with RGB lighting',
            quantity: 2,
            price: 29.99,
            amount: 59.98
          }
        ],
        subTotal: 1359.97,
        discount: 50.00,
        total: 1309.97
      }
    ];
    this.filteredInvoices = [...this.invoices];
    this.loading = false;
  }

  filterInvoices(): void {
    if (!this.searchTerm) {
      this.filteredInvoices = this.invoices;
      return;
    }
    const search = this.searchTerm.toLowerCase();
    this.filteredInvoices = this.invoices.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(search) ||
      inv.customer.name.toLowerCase().includes(search) ||
      inv.customer.email.toLowerCase().includes(search) ||
      inv.id.toString().includes(search) ||
      inv.customer.phone.toLowerCase().includes(search)
    );
  }

  formatCustomerName(name: string): string {
    if (!name || name === 'N/A') return 'N/A';
    return name.length > 20 ? name.substring(0, 17) + '...' : name;
  }

  formatEmail(email: string): string {
    if (!email) return '';
    return email.length > 25 ? email.substring(0, 22) + '...' : email;
  }

  viewInvoice(invoice: Invoice): void {
    console.log('👀 Viewing invoice:', invoice);
    this.selectedInvoice = invoice;
    this.showInvoiceModal = true;
  }

  closeModal(): void {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
  }

  deleteInvoice(invoiceId: number): void {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;

    this.invoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        alert('Invoice deleted successfully!');
        this.loadInvoices(); // Reload the list
      },
      error: (err) => {
        console.error('Error deleting invoice', err);
        alert('Failed to delete invoice. Please try again.');
      }
    });
  }

  async downloadPDF(invoice: Invoice): Promise<void> {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(33, 150, 243);
      pdf.text('MC Computers', 20, yPosition);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      yPosition += 6;
      pdf.text('123 Tech Avenue, Colombo 07, Sri Lanka', 20, yPosition);
      yPosition += 6;
      pdf.text('+94 11 234 5678 | info@mcccomputers.lk', 20, yPosition);

      // Invoice Title
      pdf.setFontSize(24);
      pdf.setTextColor(33, 150, 243);
      pdf.text('INVOICE', 160, 30);

      // Invoice Details
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      yPosition += 20;
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, 20, yPosition);

      // Customer Information
      yPosition += 15;
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
      yPosition += 20;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Thank you for your business!', 20, yPosition);
      yPosition += 5;
      pdf.text('Terms: Payment due upon receipt. Warranty covers manufacturing defects for 14 days.', 20, yPosition);

      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
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

  getTotalInvoices(): number {
    return this.invoices.length;
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, inv) => sum + inv.total, 0);
  }
}
