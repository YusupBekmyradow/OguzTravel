export const successResponse = (status: number, data: any, message: string) => ({
    status,
    data,
    message,
});

export const errorResponse = (status: number, message: string, error?: any) => ({
    status,
    message,
    errorMessage: error?.message || error,
});
