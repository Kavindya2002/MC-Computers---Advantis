using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvoiceAPI.Data;
using InvoiceAPI.Models;

namespace InvoiceAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<InvoicesController> _logger;

        public InvoicesController(ApplicationDbContext context, ILogger<InvoicesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/invoices
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetInvoices()
        {
            try
            {
                var invoices = await _context.Invoices
                    .Include(i => i.Items)
                    .OrderByDescending(i => i.InvoiceDate)
                    .ToListAsync();

                var result = invoices.Select(inv => new
                {
                    inv.Id,
                    inv.InvoiceNumber,
                    inv.InvoiceDate,
                    CustomerName = inv.CustomerName,
                    CustomerEmail = inv.CustomerEmail,
                    CustomerPhone = inv.CustomerPhone,
                    CustomerAddress = inv.CustomerAddress,
                    inv.SubTotal,
                    inv.Discount,
                    inv.Total,
                    Items = inv.Items.Select(item => new
                    {
                        item.Id,
                        item.ProductId,
                        item.ProductName,
                        item.Description,
                        item.Quantity,
                        item.Price,
                        item.Amount
                    })
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching invoices");
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        // GET: api/invoices/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetInvoice(int id)
        {
            try
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.Id == id);

                if (invoice == null)
                {
                    return NotFound(new { Message = "Invoice not found" });
                }

                var result = new
                {
                    invoice.Id,
                    invoice.InvoiceNumber,
                    invoice.InvoiceDate,
                    Customer = new
                    {
                        Name = invoice.CustomerName,
                        Email = invoice.CustomerEmail,
                        Phone = invoice.CustomerPhone,
                        Address = invoice.CustomerAddress
                    },
                    invoice.SubTotal,
                    invoice.Discount,
                    invoice.Total,
                    Items = invoice.Items.Select(item => new
                    {
                        item.Id,
                        item.ProductId,
                        item.ProductName,
                        item.Description,
                        item.Quantity,
                        item.Price,
                        item.Amount
                    })
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching invoice {Id}", id);
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateInvoice([FromBody] InvoiceCreateDto invoiceDto)
        {
            try
            {
                if (invoiceDto == null)
                    return BadRequest(new { Message = "Invoice object is null" });

                if (invoiceDto.Items == null || !invoiceDto.Items.Any())
                    return BadRequest(new { Message = "Invoice must have at least one item" });

                var invoice = new Invoice
                {
                    CustomerName = invoiceDto.CustomerName,
                    CustomerEmail = invoiceDto.CustomerEmail,
                    CustomerPhone = invoiceDto.CustomerPhone,
                    CustomerAddress = invoiceDto.CustomerAddress,
                    Discount = invoiceDto.Discount,
                    InvoiceNumber = $"INV-{DateTime.Now:yyyyMMddHHmmssfff}",
                    InvoiceDate = DateTime.Now
                };

                foreach (var itemDto in invoiceDto.Items)
                {
                    var item = new InvoiceItem
                    {
                        ProductId = itemDto.ProductId,
                        ProductName = itemDto.ProductName,
                        Description = itemDto.Description,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        Amount = itemDto.Quantity * itemDto.Price
                    };
                    invoice.Items.Add(item);
                }

                invoice.SubTotal = invoice.Items.Sum(i => i.Amount);
                invoice.Total = invoice.SubTotal - invoice.Discount;

                _context.Invoices.Add(invoice);
                await _context.SaveChangesAsync();

                var createdInvoice = await _context.Invoices
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.Id == invoice.Id);

                var response = new
                {
                    createdInvoice.Id,
                    createdInvoice.InvoiceNumber,
                    createdInvoice.InvoiceDate,
                    Customer = new
                    {
                        Name = createdInvoice.CustomerName,
                        Email = createdInvoice.CustomerEmail,
                        Phone = createdInvoice.CustomerPhone,
                        Address = createdInvoice.CustomerAddress
                    },
                    createdInvoice.SubTotal,
                    createdInvoice.Discount,
                    createdInvoice.Total,
                    Items = createdInvoice.Items.Select(item => new
                    {
                        item.Id,
                        item.ProductId,
                        item.ProductName,
                        item.Description,
                        item.Quantity,
                        item.Price,
                        item.Amount
                    })
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating invoice");
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        // DELETE: api/invoices/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            try
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.Id == id);

                if (invoice == null)
                {
                    return NotFound(new { Message = "Invoice not found" });
                }

                _context.Invoices.Remove(invoice);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Invoice deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting invoice {Id}", id);
                return StatusCode(500, new { Message = ex.Message });
            }
        }
    }

    public class InvoiceCreateDto
    {
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerAddress { get; set; } = string.Empty;
        public decimal Discount { get; set; }
        public List<InvoiceItemDto> Items { get; set; } = new List<InvoiceItemDto>();
    }

    public class InvoiceItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}