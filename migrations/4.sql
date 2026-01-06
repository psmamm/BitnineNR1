
ALTER TABLE users ADD COLUMN notification_settings TEXT DEFAULT '{"tradeAlerts":true,"performanceReports":true,"productUpdates":false}';
ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'dark';
