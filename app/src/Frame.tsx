import type { FC, PropsWithChildren } from 'react';

export const Frame: FC<PropsWithChildren> = ({ children }) => {
    return (
        <html lang="en">
            <head>
                <title>ENSIPs</title>
                <link rel="stylesheet" href="./index.css" type="text/css" />
            </head>
            <body>{children}</body>
        </html>
    );
};
