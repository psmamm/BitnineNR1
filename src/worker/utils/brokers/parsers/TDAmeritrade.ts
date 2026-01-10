/**
 * TD Ameritrade / Charles Schwab Parser
 *
 * Parses trade history exports from TD Ameritrade (now Charles Schwab).
 * Supports stocks and options transactions.
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
// TD Ameritrade Parser
// ============================================================================

export class TDAmeritradeParser extends BrokerParser {
  constructor() {
    super('td_ameritrade', 'TD Ameritrade');
  }

  getBrokerInfo(): BrokerInfo {
    return {
      id: 'td_ameritrade',
      name: 'TD Ameritrade / Charles Schwab',
      supportedAssetClasses: ['stocks', 'options'],
      csvFormat: 'custom',
      dateFormat: 'MM/DD/YYYY',
      delimiter: ','
    };
  }

  validate(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const { headers, rows } = this.parseCSV(csvContent);

    if (headers.length === 0) {
      errors.push('No headers found in CSV');
      return { valid: false, errors };
    }

    // TD Ameritrade expected columns
    const expectedColumns = ['date', 'description', 'quantity', 'price', 'amount'];
    const headerLower = headers.map(h => h.toLowerCase().trim());

    const missingColumns = expectedColumns.filter(col =>
      !headerLower.some(h => h.includes(col))
    );

    if (missingColumns.length > 0) {
      errors.push(`Missing expected columns: ${missingColumns.join(', ')}`);
    }

    if (rows.length === 0) {
      errors.push('No data rows found');
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

    const { headers, rows } = this.parseCSV(csvContent);

    // Skip non-trade rows (transfers, dividends, etc.)
    const tradeRows = rows.filter(row => {
      const desc = this.getColumnValue(row, headers, ['description', 'type', 'transaction type'])?.toLowerCase() || '';
      return desc.includes('bought') || desc.includes('sold') ||
             desc.includes('buy') || desc.includes('sell') ||
             desc.includes('opening') || desc.includes('closing');
    });

    result.totalRows = tradeRows.length;

    for (let i = 0; i < tradeRows.length; i++) {
      const row = tradeRows[i];
      const rowNum = i + 2;

      try {
        // Get date
        const dateStr = this.getColumnValue(row, headers, ['date', 'trade date', 'execution date']);
        const entryDate = this.parseDate(dateStr);

        if (!entryDate) {
          result.warnings.push(`Row ${rowNum}: Invalid date "${dateStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Parse description to get symbol and side
        const description = this.getColumnValue(row, headers, ['description', 'security description']) || '';
        const { symbol, side, assetClass, optionDetails } = this.parseDescription(description);

        if (!symbol) {
          result.warnings.push(`Row ${rowNum}: Could not extract symbol from "${description}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Get quantity and price
        const quantityStr = this.getColumnValue(row, headers, ['quantity', 'qty', 'shares']);
        const priceStr = this.getColumnValue(row, headers, ['price', 'trade price', 'execution price']);
        const amountStr = this.getColumnValue(row, headers, ['amount', 'net amount', 'principal']);
        const feeStr = this.getColumnValue(row, headers, ['commission', 'fees', 'fee']);

        const quantity = this.parseNumber(quantityStr);
        let price = this.parseNumber(priceStr);
        const amount = this.parseNumber(amountStr);

        if (!quantity || quantity === 0) {
          result.warnings.push(`Row ${rowNum}: Invalid quantity, skipping`);
          result.skippedRows++;
          continue;
        }

        // Calculate price from amount if needed
        if (!price && amount && quantity) {
          price = Math.abs(amount / quantity);
        }

        if (!price) {
          result.warnings.push(`Row ${rowNum}: Could not determine price, skipping`);
          result.skippedRows++;
          continue;
        }

        // Create trade
        const trade: ParsedTrade = {
          symbol: symbol.toUpperCase(),
          assetClass,
          side: side || 'buy',
          quantity: Math.abs(quantity),
          entryPrice: price,
          fee: Math.abs(this.parseNumber(feeStr) || 0),
          feeCurrency: 'USD',
          entryDate,
          importSource: 'td_ameritrade',
          rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
        };

        // Add option details if present
        if (optionDetails) {
          trade.optionType = optionDetails.type;
          trade.strikePrice = optionDetails.strike;
          trade.expirationDate = optionDetails.expiration;
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

  private parseDescription(description: string): {
    symbol: string | undefined;
    side: TradeSide | undefined;
    assetClass: AssetClass;
    optionDetails?: { type: 'call' | 'put'; strike: number; expiration: string };
  } {
    const desc = description.toUpperCase();

    // Determine side
    let side: TradeSide | undefined;
    if (desc.includes('BOUGHT') || desc.includes('BUY TO OPEN') || desc.includes('BUY TO CLOSE')) {
      side = 'buy';
    } else if (desc.includes('SOLD') || desc.includes('SELL TO OPEN') || desc.includes('SELL TO CLOSE')) {
      side = 'sell';
    }

    // Check for options
    // Format: "BOUGHT +1 AAPL 100 21 JAN 22 150 CALL @1.50"
    const optionMatch = desc.match(/([A-Z]+)\s+(\d+)\s+(\d{1,2}\s+[A-Z]{3}\s+\d{2})\s+(\d+(?:\.\d+)?)\s+(CALL|PUT)/);

    if (optionMatch) {
      return {
        symbol: optionMatch[1],
        side,
        assetClass: 'options',
        optionDetails: {
          type: optionMatch[5].toLowerCase() as 'call' | 'put',
          strike: parseFloat(optionMatch[4]),
          expiration: optionMatch[3]
        }
      };
    }

    // Stock format: "BOUGHT +100 AAPL @150.00" or "SOLD -50 MSFT @280.00"
    const stockMatch = desc.match(/([A-Z]+)\s*@/);
    const symbolFromStart = desc.match(/^(?:BOUGHT|SOLD)\s+[+-]?\d+\s+([A-Z]+)/);

    const symbol = stockMatch?.[1] || symbolFromStart?.[1];

    return {
      symbol,
      side,
      assetClass: 'stocks'
    };
  }
}

// ============================================================================
// Export Factory
// ============================================================================

export function createTDAmeritradeParser(): TDAmeritradeParser {
  return new TDAmeritradeParser();
}
