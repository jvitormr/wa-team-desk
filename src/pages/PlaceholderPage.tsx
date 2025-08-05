import React from "react";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-2xl font-bold">{title} - Em desenvolvimento</h1>
    </div>
  );
};

export default PlaceholderPage;
