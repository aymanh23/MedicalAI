
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-medical-light">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-6xl font-bold text-medical-blue mb-4">404</h1>
        <p className="text-2xl text-medical-slate mb-8">
          Oops! The page you're looking for can't be found.
        </p>
        <Button asChild>
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
