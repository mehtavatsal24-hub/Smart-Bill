import React from "react";
import { motion } from "motion/react";
import { ChevronLeft, FileText, Scale, AlertTriangle, CreditCard, UserCheck, Gavel } from "lucide-react";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";

interface TermsAndConditionsProps {
  onBack: () => void;
}

export const TermsAndConditions = ({ onBack }: TermsAndConditionsProps) => {
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
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Terms & Conditions</h1>
          <p className="text-zinc-500 font-medium">Last updated: March 1, 2026</p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-zinc-200/50 overflow-hidden">
        <div className="h-2 bg-indigo-600" />
        <CardContent className="p-8 md:p-12 space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <Gavel className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Agreement to Terms</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              By accessing or using our Billing Application, you agree to be bound by these Terms and Conditions. These terms are governed by the <strong>Laws of India</strong>, including the <strong>Information Technology Act, 2000</strong> and the <strong>Consumer Protection Act, 2019</strong>. If you do not agree with any part of these terms, you must not use our service.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <UserCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">User Responsibilities</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              As a user of this application, you are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600">
              <li><strong>Accuracy of Information:</strong> Ensuring all business details, GSTIN, and tax calculations are correct.</li>
              <li><strong>GST Compliance:</strong> Following the rules set by the <strong>GST Council of India</strong> for invoice generation.</li>
              <li><strong>Data Backup:</strong> Regularly exporting your data, as the app primarily stores data locally on your device.</li>
              <li><strong>Security:</strong> Maintaining the confidentiality of your account credentials.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <CreditCard className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Subscription & Payments</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Our application offers premium features through a subscription model.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-600">
              <li><strong>Billing:</strong> Payments are processed through secure third-party gateways.</li>
              <li><strong>Refunds:</strong> Refund policies are governed by the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>.</li>
              <li><strong>Cancellation:</strong> You can cancel your subscription at any time, but no partial refunds will be provided.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Limitation of Liability</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed italic">
              "The application is provided 'as is' without any warranty."
            </p>
            <p className="text-zinc-600 leading-relaxed">
              We shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the service, including but not limited to financial losses or data corruption. The user is solely responsible for verifying the legal validity of the documents generated.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <Scale className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Governing Law & Jurisdiction</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the <strong>Laws of India</strong>. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the <strong>Courts in India</strong>.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <FileText className="h-6 w-6" />
              <h2 className="text-xl font-bold text-zinc-900">Modifications</h2>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any significant changes by updating the "Last updated" date at the top of this page. Continued use of the service after such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <div className="pt-10 border-t border-zinc-100">
            <p className="text-sm text-zinc-400 text-center">
              By using our application, you acknowledge that you have read and understood these Terms and Conditions.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
