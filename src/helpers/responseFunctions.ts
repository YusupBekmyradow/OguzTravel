export const successResponse = (status: number, data: any, message: string) => ({
    status,
    data,
    message,
});

export const errorResponse = (status: number, message: string, error?: any) => {
    if (error) {
        console.error(`\x1b[31m[Service Error ${status}] ${message}:\x1b[0m`, error?.stack || error);
    }
    return {
        status,
        message,
        errorMessage: error?.message || error,
    };
};
