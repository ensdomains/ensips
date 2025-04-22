import type { FC } from 'react';

import type { Frontmatter } from '../specs/validateFrontmatter';

export const Header: FC<{ frontmatter: Frontmatter }> = ({ frontmatter }) => {
    return (
        <header className="front space-y-4">
            <div>
                <b>Description</b>
                <div>{frontmatter.description}</div>
            </div>
            <div>
                <b>Status</b>
                <div>{frontmatter.status}</div>
            </div>
            <div>
                <b>Created</b>
                <div>
                    {frontmatter.created.toLocaleDateString('UTC', {
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </div>
            </div>
            <div>
                <b>
                    Author
                    {frontmatter.authors.length > 1 ? 's' : ''}
                </b>
                <ul>
                    {frontmatter.authors.map((author, index) => {
                        return <li key={index}>{author}</li>;
                    })}
                </ul>
            </div>
        </header>
    );
};
