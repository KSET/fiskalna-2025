/**
 * FIRA Plugin
 * Automatically creates fiscalized invoices in FIRA when orders are paid.
 */

/**
 * Triggered when a receipt/order is marked as paid.
 * Creates a fiscalized invoice in FIRA with order details.
 *
 * @param {object} order - Receipt object with items array
 * @param {string} order.id - Receipt ID
 * @param {string} order.code - Receipt number/code
 * @param {string} order.email - Customer email
 * @param {string} order.createdAt - Receipt creation datetime (ISO string)
 * @param {string} order.currency - Currency code (e.g. "EUR")
 * @param {Array}  order.items - Array of receipt items
 */
export async function handleOrderFiscalization(order) {
  // Skip free orders - no invoice needed
  // if (order.total === 0) {
  //   console.log(`Order ${order.code} has total of 0. Skipping FIRA invoice creation.`);
  //   return;
  // }

  // Group order positions by FIRA product ID
  const itemsGrouped = {};

  for (const position of order.items) {
    const firaId = position.article?.productCode;
    if (firaId && firaId !== '-1') {
      if (!itemsGrouped[firaId]) {
        itemsGrouped[firaId] = { quantity: 0, price: 0, name: "" };
      }
      itemsGrouped[firaId].quantity += 1;
      if (itemsGrouped[firaId].price === 0) {
        itemsGrouped[firaId].price = parseFloat(position.price);
        itemsGrouped[firaId].name = position.name || position.article?.name || "";
      }
    }
  }

  // Build line items for FIRA API
  const lineItems = Object.entries(itemsGrouped).map(([firaId, itemData]) => ({
    productCode: firaId,
    lineItemId: firaId,
    quantity: itemData.quantity,
    price: itemData.price,
    name: itemData.name,
    taxRate: 0.05,
  }));

  if (lineItems.length === 0) {
    console.log(`No valid items with FIRAID for order ${order.code}. Skipping FIRA invoice creation.`);
    return;
  }


  // Format datetime for FIRA API (LocalDateTime format without timezone)
  const createdAt = new Date(order.createdAt).toISOString().slice(0, 19);

  // Billing address for FIRA API
  // Include email if available - FIRA will send email invoice if configured
  const billingAddress = {
    country: "HR",
  };

  if (order.email) {
    billingAddress.email = order.email;
  }

  // Calculate invoice totals (prices are tax-included)
  // Formula: netto = brutto / (1 + taxRate), tax = brutto - netto
  let totalBrutto = 0.0;
  let totalNetto = 0.0;
  let totalTax = 0.0;

  for (const item of lineItems) {
    const itemBrutto = item.price * item.quantity;
    const itemNetto = itemBrutto / (1 + item.taxRate);
    const itemTax = itemBrutto - itemNetto;
    totalBrutto += itemBrutto;
    totalNetto += itemNetto;
    totalTax += itemTax;
  }
  // Round to 2 decimal places
  totalBrutto = Math.round(totalBrutto * 100) / 100;
  totalNetto = Math.round(totalNetto * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;

  // Prepare invoice data for FIRA
  const data = {
    webshopOrderId: parseInt(order.code.replace(/\D/g, '').slice(-15)),
    webshopType: "CUSTOM",
    webshopOrderNumber: order.code,
    invoiceType: process.env.FIRA_INVOICE_TYPE || 'PONUDA',
    createdAt,
    currency: order.currency,
    paymentType: "KARTICA",
    taxesIncluded: true,
    brutto: totalBrutto,
    netto: totalNetto,
    taxValue: totalTax,
    billingAddress,
    lineItems,
  };

  console.log(`Sending to FIRA: ${JSON.stringify(data, null, 2)}`);

  // MOCK response (comment out when using real FIRA)
  // const mockResponse = {
  //   invoiceNumber: `355-${Date.now()}-7`,
  //   invoiceDate: '2026-02-19T12:29:00',
  //   jir: '4fd92a0f-62fa-421f-a932-1dbd9f5af34b',
  //   zki: '809d7831f8b4a434843634d3af71cf5a',
  //   qrCode: 'iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQAAAACFI5MzAAABuUlEQVR4Xu2WUWoDMQwFDb6WQVcX+FqC7Ru52UBo/6T2Z50lrDOBSPb4Zcf12xifH9zjIQ9h/CXxMaYP2zF1b5tpC9lcoanrsjNtIT53rDVF17CctpHLl7n5VBHNZFhW8T1tIbr0qSq4wvZm2kJQYr/Hhzt1hMFq6rd3aOvOqCe+ZIhtp9kZLOfdaSlBjzWlfPDilio6SMhARw8fSzf3itYSTRf9kRbXFXnfQdCPFeVgGcc4xa8nCD+RXmdryBBPS+rJ2SyO8DAtp/G9FpK95TJSS6B+B3H6U5N8Ih83od5C5rF+UIfkX0Yt9STdU7snygH3GpQSfnSQrwolvWNlC2EZJQWFKCM8Jx0kiDzJOAkMeU8ZHeRC96GHFFIpdXl3Wkk4U8oIXAwLDtir02JyNkwyznzgWu8KSglZlAnBl6S/KmohiJ7/TjpamRq3IbWEPkkIBrqcv4wGshV2kmPTqiGKtRAGu6cmM8WpqIOge4yTsmICr05ryUYS7Z5uMo3UdA+hTRKJ3aOUTkLe6SVXjohNJMgiHuvO3vWQK2UkiILL70SqJRmvCgs2zaS+3RXUkp/HQx7C+H/yBb/NSF9L7TUmAAAAAElFTkSuQmCC',
  // };
  // console.log(`FIRA mock response: ${JSON.stringify(mockResponse)}`);
  // return mockResponse;

  const url = process.env.FIRA_API_URL || 'https://app.fira.finance/api/v1/webshop/order/custom';
  const headers = { 'FIRA-Api-Key': process.env.FIRA_API_KEY, 'Content-Type': 'application/json' };
  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
    console.log(`FIRA response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`FIRA response body: ${responseText}`);
    if (response.status === 200) {
      const responseData = JSON.parse(responseText);
      console.log(`FIRA fiscalized success, račun: ${responseData.invoiceNumber}, JIR: ${responseData.jir}`);
      return { invoiceNumber: responseData.invoiceNumber, invoiceDate: responseData.invoiceDate, jir: responseData.jir, zki: responseData.zki };
    } else {
      console.log(`FIRA invoice creation FAILED. Status ${response.status}: ${responseText}`);
      return null;
    }
  } catch (e) {
    console.log(`FIRA invoice creation FAILED with exception: ${e.message}`);
    return null;
  }
}
