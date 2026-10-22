"use client";

import Link from "next/link";
import Image from "next/image";
import { FaLinkedin } from "react-icons/fa";
import { FiMail, FiPhone, FiMapPin, FiExternalLink } from "react-icons/fi";
import Button from "./Button";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#181a1f] text-white">
      {/* Main Footer */}
      <div className="px-4 md:px-8 lg:px-12 xl:px-16 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Image src="/assets/card-token.png" alt="Opus Bloc" width={40} height={40} />
              <span className="text-xl font-bold tracking-wider">OPUS BLOC</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Revolutionizing real estate transactions through blockchain technology.
            </p>
            <Link
              href="https://www.linkedin.com/company/opus-bloc"
              className="text-gray-400 hover:text-white"
            >
              <FaLinkedin className="w-5 h-5" />
            </Link>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/about-us">About Us</Link></li>
              <li><Link href="/marketPlace">Marketplace</Link></li>
              <li><Link href="/deals">Deals</Link></li>
              <li><Link href="/explorer">Explorer</Link></li>
              <li><Link href="/about/team">Team</Link></li>
              <li><Link href="/about/careers">Careers</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/documentation">Documentation</Link></li>
              <li><Link href="/api">API Reference</Link></li>
              <li><Link href="/security">Security</Link></li>
              <li className="flex items-center gap-1">
                <Link href="/status">System Status</Link>
                <FiExternalLink className="w-3 h-3" />
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center gap-2"><FiMail /> info@opusbloc.com</div>
              <div className="flex items-center gap-2"><FiPhone /> +91 123 456 7890</div>
              <div className="flex items-start gap-2"><FiMapPin /> Saudi Arabia</div>
            </div>

            {/* Newsletter */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold mb-2">Stay Updated</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md"
                />
                <Button className="px-4 py-2 text-sm">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-gray-700 bg-[#1a1c23] px-4 md:px-8 lg:px-12 xl:px-16 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Districts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#006B35]">130K+</div>
            <div className="text-xs text-gray-400">Transactions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#006B35]">24/7</div>
            <div className="text-xs text-gray-400">Support</div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-700 bg-[#0f1116] px-4 md:px-8 lg:px-12 xl:px-16 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span>© {currentYear} Opus Bloc. All rights reserved.</span>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/compliance">Compliance</Link>
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            Built with <span className="text-red-400">♥</span> in Region
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
