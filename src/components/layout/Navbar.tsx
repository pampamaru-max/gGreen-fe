'use client';

import Link from 'next/link';

export const Navbar = () => {
  return (
    <nav className="bg-white border-b border-gray-200 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          My App
        </Link>
        <div className="space-x-6">
          <Link href="/" className="text-gray-600 hover:text-blue-600">Home</Link>
          <Link href="/about" className="text-gray-600 hover:text-blue-600">About</Link>
          <Link href="/contact" className="text-gray-600 hover:text-blue-600">Contact</Link>
        </div>
      </div>
    </nav>
  );
};
