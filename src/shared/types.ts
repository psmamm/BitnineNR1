import z from "zod";

/**
 * Types shared between the client and server go here.
 */

export const AssetTypeSchema = z.enum(['stocks', 'crypto', 'forex']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const TradeSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  symbol: z.string(),
  asset_type: AssetTypeSchema,
  direction: z.enum(['long', 'short']),
  quantity: z.number(),
  entry_price: z.number(),
  exit_price: z.number().optional(),
  entry_date: z.string(),
  exit_date: z.string().optional(),
  strategy_id: z.number().optional(),
  commission: z.number().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  pnl: z.number().optional(),
  leverage: z.number().optional(),
  screenshot_url: z.string().optional(),
  setup: z.string().optional(),
  mistakes: z.string().optional(),
  session: z.string().optional(),
  emotion: z.string().optional(),
  rating: z.number().optional(),
  is_closed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Trade = z.infer<typeof TradeSchema>;
