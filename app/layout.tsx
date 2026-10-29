import type {Metadata} from 'next';
export const metadata:Metadata={title:'Внутри — СПбГУПТД',description:'Здание, этажи и места для самостоятельной работы.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
