export const Logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[INFO] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[WARN] [${context}] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[ERROR] [${context}] ${message}`);
    if (error) {
      if (error.message) console.error(error.message);
      if (error.stack) console.error(error.stack);
      else console.error(error);
    }
  },
  debug: (context: string, message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[DEBUG] [${context}] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
};
