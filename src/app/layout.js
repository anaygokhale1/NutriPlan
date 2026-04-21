export const metadata = {
  title: 'NutriPlan',
  description: 'Science-Backed Nutrition, Personalized for You',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
