import type { FC } from 'react';

import type { Frontmatter } from '.';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';

export const App: FC<{ markdown: string; frontmatter: Frontmatter }> = ({
    markdown,
    frontmatter,
}) => {
    return (
        <html lang="en">
            <head>
                <title>ENSIPs</title>
                <link rel="stylesheet" href="./index.css" type="text/css" />
            </head>
            <body>
                <article>
                    <Navbar />
                    <Header frontmatter={frontmatter} />
                    <div dangerouslySetInnerHTML={{ __html: markdown }} />
                    <div>ENSIPs</div>
                </article>
            </body>
        </html>
    );
};
