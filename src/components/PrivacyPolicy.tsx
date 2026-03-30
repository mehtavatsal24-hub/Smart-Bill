import React from "react";
import { motion } from "motion/react";
import { ChevronLeft, Shield, Lock, Eye, Database, UserCheck, Scale } from "lucide-react";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy = ({ onBack }: PrivacyPolicyProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-500 font-medium">Last updated: March 1, 2026</p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-zinc-200/50 overflow-hidden">
        <div className="h-2 bg-brand-600" />
        <CardContent className="p-8 md:p-12 space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <Shield className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Introduction</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Welcome to our Billing Application. We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application, in compliance with the <strong>Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act (DPDP), 2023</strong> of India.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <Database className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Data Collection & Storage</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Our application is designed with a "Privacy-First" approach. Most of the data you enter (Business details, Customer details, Invoices) is stored <strong>locally in your browser's storage (LocalStorage)</strong>.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600">
              <li><strong>Personal Information:</strong> Name, Email, and Subscription status (stored on our secure servers if you create an account).</li>
              <li><strong>Business Data:</strong> GSTIN, Address, Logo, and Bank details (stored locally on your device).</li>
              <li><strong>Transaction Data:</strong> Invoice history, Quotations, and Price history (stored locally on your device).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <Lock className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Data Security</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              We implement industry-standard security measures to protect your data. Since your business data resides on your device, the security of that data also depends on your device's security. We recommend using secure browsers and keeping your device updated.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <Eye className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">How We Use Your Data</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              We use your information only to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600">
              <li>Provide and maintain the service.</li>
              <li>Generate professional PDF documents as per your input.</li>
              <li>Manage your subscription and account access.</li>
              <li>Comply with legal obligations under Indian Law.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <UserCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Your Rights (DPDP Act, 2023)</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Under the DPDP Act, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600">
              <li><strong>Right to Access:</strong> You can see all data stored in the app at any time.</li>
              <li><strong>Right to Correction:</strong> You can edit any details in the settings.</li>
              <li><strong>Right to Erasure:</strong> You can clear your history or delete your account to remove all data.</li>
              <li><strong>Right to Withdraw Consent:</strong> You can stop using the app and clear browser data at any time.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-brand-600">
              <Scale className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Legal Compliance</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              We comply with the <strong>GST laws of India</strong> regarding invoice formats and data retention. Users are responsible for the accuracy of the GSTIN and tax calculations provided in the documents generated.
            </p>
          </section>

          <div className="pt-10 border-t border-zinc-100">
            <p className="text-sm text-zinc-400 text-center">
              If you have any questions about this Privacy Policy, please contact us at support@billingapp.in
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
