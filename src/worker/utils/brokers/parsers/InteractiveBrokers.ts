/**
 * Interactive Brokers Parser
 *
 * Parses trade confirmations and activity statements from Interactive Brokers.
 * Supports stocks, forex, futures, and options.
 */

import {
  BrokerParser,
  BrokerInfo,
  ParseResult,
  ParsedTrade,
  TradeSide,
  AssetClass
} from '../BrokerInterface';

// ============================================================================
// Interactive Brokers Parser
// ============================================================================

export class InteractiveBrokersParser extends BrokerParser {
  constructor() {
    super('interactive_brokers', 'Interactive Brokers');
  }

  getBrokerInfo(): BrokerInfo {
    return {
      id: 'interactive_brokers',
      name: 'Interactive Brokers',
      supportedAssetClasses: ['stocks', 'forex', 'futures', 'options'],
      csvFormat: 'custom',
      dateFormat: 'YYYY-MM-DD',
      delimiter: ','
    };
  }

  validate(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // IB activity statements have sections; find the Trades section
    const hasTradesSection = csvContent.includes('Trades,') ||
                             csvContent.toLowerCase().includes('trades');

    if (!hasTradesSection) {
      errors.push('Could not find Trades section in IBKR export');
    }

    const { headers, rows } = this.extractTradesSection(csvContent);

    if (headers.length === 0) {
      errors.push('No trade headers found');
    }

    if (rows.length === 0) {
      errors.push('No trade data rows found');
    }

    return { valid: errors.length === 0, errors };
  }

  async parse(csvContent: string): Promise<ParseResult> {
    const result: ParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0
    };

    // Extract trades section from IBKR format
    const { headers, rows } = this.extractTradesSection(csvContent);

    if (headers.length === 0) {
      result.errors.push('Could not extract trade headers from IBKR export');
      return result;
    }

    result.totalRows = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // IB columns: Symbol, Date/Time, Quantity, T.Price, C.Price, Proceeds, Comm/Fee, Basis, Realized P/L, MTM P/L, Code

        // Get symbol and asset class
        const symbolRaw = this.getColumnValue(row, headers, ['symbol', 'underlying symbol']);
        const assetCategory = this.getColumnValue(row, headers, ['asset category', 'asset class', 'type']);

        if (!symbolRaw) {
          result.warnings.push(`Row ${rowNum}: Missing symbol, skipping`);
          result.skippedRows++;
          continue;
        }

        // Parse symbol and determine asset class
        const { symbol, assetClass } = this.parseSymbolAndClass(symbolRaw, assetCategory);

        // Get date/time
        const dateStr = this.getColumnValue(row, headers, ['date/time', 'date', 'trade date']);
        const entryDate = this.parseDate(dateStr);

        if (!entryDate) {
          result.warnings.push(`Row ${rowNum}: Invalid date "${dateStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Get quantity and price
        const quantityStr = this.getColumnValue(row, headers, ['quantity', 'qty', 'shares']);
        const priceStr = this.getColumnValue(row, headers, ['t. price', 'trade price', 'price', 'execution price']);

        const quantity = this.parseNumber(quantityStr);
        const price = this.parseNumber(priceStr);

        if (!quantity || !price) {
          result.warnings.push(`Row ${rowNum}: Invalid quantity or price, skipping`);
          result.skippedRows++;
          continue;
        }

        // Determine side from quantity sign
        const side: TradeSide = quantity > 0 ? 'buy' : 'sell';

        // Get fees and P&L
        const feeStr = this.getColumnValue(row, headers, ['comm/fee', 'commission', 'fee', 'ibcommission']);
        const pnlStr = this.getColumnValue(row, headers, ['realized p/l', 'realized pnl', 'profit/loss', 'pnl']);

        // Get currency
        const currency = this.getColumnValue(row, headers, ['currency', 'cur.']) || 'USD';

        // Get order ID
        const orderId = this.getColumnValue(row, headers, ['order id', 'orderid', 'execution id']);

        // Create trade
        const trade: ParsedTrade = {
          externalId: orderId,
          symbol: symbol.toUpperCase(),
          assetClass,
          side,
          quantity: Math.abs(quantity),
          entryPrice: price,
          fee: Math.abs(this.parseNumber(feeStr) || 0),
          feeCurrency: currency,
          realizedPnl: this.parseNumber(pnlStr),
          entryDate,
          importSource: 'interactive_brokers',
          rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
        };

        // Parse options details if applicable
        if (assetClass === 'options') {
          const optionDetails = this.parseOptionSymbol(symbolRaw);
          if (optionDetails) {
            trade.optionType = optionDetails.type;
            trade.strikePrice = optionDetails.strike;
            trade.expirationDate = optionDetails.expiration;
          }
        }

        result.trades.push(trade);
        result.parsedRows++;

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        result.warnings.push(`Row ${rowNum}: Parse error - ${message}`);
        result.skippedRows++;
      }
    }

    result.success = result.parsedRows > 0;
    return result;
  }

  private extractTradesSection(csvContent: string): { headers: string[]; rows: string[][] } {
    const lines = csvContent.split(/\r?\n/);

    let tradesStartIndex = -1;
    let tradesEndIndex = lines.length;

    // Find trades section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // IBKR format: "Trades,Header,..." or "Trades" followed by "Data"
      if (line.startsWith('trades,header') || line.startsWith('trades,data')) {
        if (line.includes('header')) {
          tradesStartIndex = i;
        } else if (tradesStartIndex !== -1 && line.includes('data')) {
          // This is a data row
          continue;
        }
      }

      // End of trades section (next section starts)
      if (tradesStartIndex !== -1 && i > tradesStartIndex) {
        const sectionMatch = line.match(/^([a-z]+),header/);
        if (sectionMatch && sectionMatch[1] !== 'trades') {
          tradesEndIndex = i;
          break;
        }
      }
    }

    // If we didn't find the section marker, try simple CSV format
    if (tradesStartIndex === -1) {
      return this.parseCSV(csvContent);
    }

    // Extract trades section
    const tradesSection = lines.slice(tradesStartIndex, tradesEndIndex);

    // Parse the section
    const headerLine = tradesSection.find(l => l.toLowerCase().includes('trades,header'));
    const dataLines = tradesSection.filter(l => l.toLowerCase().startsWith('trades,data'));

    if (!headerLine) {
      return { headers: [], rows: [] };
    }

    // Skip "Trades" and "Header" columns
    const headers = this.parseCSVLine(headerLine).slice(2);
    const rows = dataLines.map(line => this.parseCSVLine(line).slice(2));

    return { headers, rows };
  }

  private parseSymbolAndClass(symbol: string, category?: string): { symbol: string; assetClass: AssetClass } {
    const cat = category?.toLowerCase() || '';

    if (cat.includes('forex') || cat.includes('cash')) {
      return { symbol: symbol.replace('.', ''), assetClass: 'forex' };
    }

    if (cat.includes('future') || cat.includes('fut')) {
      return { symbol, assetClass: 'futures' };
    }

    if (cat.includes('option') || cat.includes('opt')) {
      // Extract underlying from option symbol
      const underlying = symbol.match(/^([A-Z]+)/)?.[1] || symbol;
      return { symbol: underlying, assetClass: 'options' };
    }

    if (cat.includes('stock') || cat.includes('stk')) {
      return { symbol, assetClass: 'stocks' };
    }

    // Auto-detect from symbol
    return { symbol, assetClass: this.determineAssetClass(symbol) };
  }

  private parseOptionSymbol(symbol: string): { type: 'call' | 'put'; strike: number; expiration: string } | undefined {
    // IBKR option format: AAPL 230120C00150000
    const match = symbol.match(/([A-Z]+)\s*(\d{6})([CP])(\d+)/);

    if (!match) return undefined;

    const expDate = match[2];
    const optType = match[3] === 'C' ? 'call' : 'put';
    const strike = parseInt(match[4]) / 1000; // Strike is in thousandths

    // Parse date: YYMMDD
    const year = 2000 + parseInt(expDate.slice(0, 2));
    const month = expDate.slice(2, 4);
    const day = expDate.slice(4, 6);

    return {
      type: optType,
      strike,
      expiration: `${year}-${month}-${day}`
    };
  }
}

// ============================================================================
// Export Factory
// ============================================================================

export function createInteractiveBrokersParser(): InteractiveBrokersParser {
  return new InteractiveBrokersParser();
}
