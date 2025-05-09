
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-medical-slate mb-4">MedicalAI</h3>
            <p className="text-sm text-gray-600">
              AI-powered healthcare assistant designed to enhance medical triaging 
              and optimize patient-doctor interactions.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-medical-slate mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-gray-600 hover:text-medical-blue">Home</Link></li>
              <li><Link to="/about" className="text-sm text-gray-600 hover:text-medical-blue">About</Link></li>
              <li><Link to="/doctor-dashboard" className="text-sm text-gray-600 hover:text-medical-blue">Doctor Portal</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-medical-slate mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm text-gray-600 hover:text-medical-blue">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-600 hover:text-medical-blue">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MedicalAI. All rights reserved. 
            This is a demonstration project.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
