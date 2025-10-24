using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace InvoiceAPI.Models
{
    public class Invoice
    {
        public int Id { get; set; }

        [BindNever]
        public string InvoiceNumber { get; set; } = string.Empty;

        public DateTime InvoiceDate { get; set; } = DateTime.Now;

        [Required]
        public string CustomerName { get; set; } = string.Empty;
        
        [Required]
        public string CustomerEmail { get; set; } = string.Empty;
        
        [Required]
        public string CustomerPhone { get; set; } = string.Empty;
        
        [Required]
        public string CustomerAddress { get; set; } = string.Empty;

        public decimal SubTotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Total { get; set; }

        public List<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    }
}