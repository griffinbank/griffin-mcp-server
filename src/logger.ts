interface Logger {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}


const logger: Logger = {
    info: (...args: any[]): void => console.error("ℹ️", ...args),
    warn: (...args: any[]): void => console.error("⚠️", ...args),
    error: (...args: any[]): void => console.error("❌ ", ...args)
};

export { logger }
