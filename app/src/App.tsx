import type { FC } from 'react';

import type { Frontmatter } from '.';
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
                    <div className="front space-y-4">
                        <div>
                            <b>Description</b>
                            <div>{frontmatter.description}</div>
                        </div>
                        <div>
                            <b>Status</b>
                            <div>{frontmatter.ensip.status}</div>
                        </div>
                        <div>
                            <b>Created</b>
                            <div>{frontmatter.ensip.created}</div>
                        </div>
                        <div>
                            <b>
                                Author
                                {frontmatter.contributors.length > 1 ? 's' : ''}
                            </b>
                            <ul>
                                {frontmatter.contributors.map(
                                    (contributor, index) => {
                                        return (
                                            <li key={index}>{contributor}</li>
                                        );
                                    }
                                )}
                            </ul>
                        </div>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: markdown }} />
                    <div>ENSIPs</div>
                </article>
            </body>
        </html>
    );
};
