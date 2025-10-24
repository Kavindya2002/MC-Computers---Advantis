import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice } from '../../models/invoice';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  invoices: Invoice[] = [];
  recentInvoices: Invoice[] = [];

  constructor(
    private invoiceService: InvoiceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getInvoices().subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        this.recentInvoices = invoices.slice(-5).reverse();
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
      }
    });
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  }

  getThisMonthRevenue(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.invoices
      .filter(invoice => {
        const invoiceDate = new Date(invoice.invoiceDate);
        return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
      })
      .reduce((sum, invoice) => sum + invoice.total, 0);
  }

  formatCustomerName(name: string): string {
    if (name.length > 20) {
      return name.substring(0, 17) + '...';
    }
    return name;
  }

  viewInvoice(invoice: Invoice): void {
    this.router.navigate(['/invoices']);
  }

  viewAllInvoices(): void {
    this.router.navigate(['/invoices']);
  }
}
