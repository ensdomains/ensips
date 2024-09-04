// Error wrapper that includes a filename, line number, column number, and column end
export class TracedError extends Error {
    constructor(
        error: Error | string,
        filename: string,
        line: number,
        column: number,
        columnEnd: number
    ) {
        if (typeof error === 'string') {
            super(error);
        } else {
            super(error.message);
        }

        this.error = error;
        this.filename = filename;
        this.line = line;
        this.column = column;
        this.columnEnd = columnEnd;
    }

    error: Error | string;
    filename: string;
    line: number;
    column: number;
    columnEnd: number;
}
