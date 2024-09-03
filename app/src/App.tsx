import { Navbar } from './Navbar';

export const App: React.FC<{ markdown: string }> = ({ markdown }) => {
    return (
        <html>
            <head>
                <title>ENSIPs</title>
                <link rel="stylesheet" href="./index.css" type="text/css" />
            </head>
            <body>
                <article>
                    <Navbar />
                    <div dangerouslySetInnerHTML={{ __html: markdown }} />
                    <div>
                        ENSIPs
                    </div>
                </article>
            </body>
        </html>
    )
};
