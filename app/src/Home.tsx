import type { FC } from 'react';

import type { ENSIPData } from '.';
import { Navbar } from './components/Navbar';
import { Frame } from './Frame';

export const Home: FC<{ ensips: ENSIPData[] }> = ({ ensips }) => {
    return (
        <Frame>
            <article>
                <Navbar />
                <h1>ENSIPs</h1>
                <ul>
                    {ensips.map(({ path, title }) => (
                        <li key={path}>
                            <a href={`/${path}`}>{title}</a>
                        </li>
                    ))}
                </ul>
            </article>
        </Frame>
    );
};
