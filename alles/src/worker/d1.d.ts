declare interface D1Database {
    // Minimal placeholder for Cloudflare D1 Database API used in the worker.
    // The real API provides methods like `prepare`, `batch`, etc.
    // Here we only need `prepare` for the current code.
    prepare(statement: string): {
        bind(...args: any[]): {
            run(): Promise<any>;
            all(): Promise<any>;
        };
    };
}

