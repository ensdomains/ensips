import type { FC } from 'react';

import type { ENSIPData } from '.';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { Frame } from './Frame';

export const App: FC<{ data: ENSIPData }> = ({ data }) => {
    const { frontmatter, markdown } = data;

    return (
        <Frame>
            <article>
                <Navbar />
                <Header frontmatter={frontmatter} />
                <div
                    dangerouslySetInnerHTML={{ __html: markdown }}
                    className="content"
                />
            </article>
        </Frame>
    );
};
