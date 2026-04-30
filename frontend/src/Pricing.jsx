import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { BorderBeam } from "@/components/ui/border-beam"
import { ScrollMarkerReveal } from "@/components/ui/scroll-marker-reveal"
import CompetitorTable from './components/CompetitorTable';
import './Pricing.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PLAN_COPY = {
    starter: { title: 'Starter', monthly: 4999, yearly: 3749 },
    growth: { title: 'Growth', monthly: 19999, yearly: 14999 },
    enterprise: { title: 'Enterprise', monthly: null, yearly: null },
};

export default function Pricing({ currentUser }) {
    const [isYearly, setIsYearly] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('upi');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [checkoutSuccess, setCheckoutSuccess] = useState('');
    const [checkoutData, setCheckoutData] = useState(null);
    const [form, setForm] = useState({
        customer_name: '',
        customer_email: '',
        account_identifier: '',
        reference: '',
    });

    const containerVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.12
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 32 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }
        }
    };

    const popularCardVariants = {
        hidden: { opacity: 0, y: 32 },
        visible: {
            opacity: 1,
            y: -12,
            transition: { duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }
        },
        hover: {
            y: -18,
            boxShadow: "0 0 0 1px rgba(124,58,237,0.4), 0 40px 100px rgba(124,58,237,0.35)",
            transition: { duration: 0.3 }
        }
    };

    const normalCardHover = {
        hover: {
            y: -6,
            boxShadow: "0 24px 64px rgba(0,0,0,0.10)",
            transition: { duration: 0.3, ease: "easeOut" }
        }
    };

    const priceVariants = {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 6 }
    };

    const CheckIcon = () => (
        <span className="feature-check">
            <svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
    );

    const CrossIcon = () => (
        <span className="feature-x">
            <svg viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </span>
    );

    useEffect(() => {
        if (!selectedPlan) return;
        setCheckoutError('');
        setCheckoutSuccess('');
        setCheckoutData(null);
        setPaymentMethod(selectedPlan === 'enterprise' ? 'contact' : 'upi');
        setForm({
            customer_name: currentUser?.name || '',
            customer_email: currentUser?.email || '',
            account_identifier: '',
            reference: '',
        });
    }, [selectedPlan, currentUser]);

    const activePlan = selectedPlan ? PLAN_COPY[selectedPlan] : null;
    const activeAmount = useMemo(() => {
        if (!activePlan) return null;
        if (selectedPlan === 'enterprise') return null;
        return isYearly ? activePlan.yearly : activePlan.monthly;
    }, [activePlan, isYearly, selectedPlan]);

    const handleSelect = (plan) => {
        setSelectedPlan(plan);
    };

    const handleCheckout = async () => {
        if (!selectedPlan) return;

        setCheckoutLoading(true);
        setCheckoutError('');
        setCheckoutSuccess('');

        try {
            const payload = {
                plan: selectedPlan,
                billing_cycle: isYearly ? 'yearly' : 'monthly',
                payment_method: selectedPlan === 'enterprise' ? 'contact' : paymentMethod,
                customer_name: form.customer_name.trim(),
                customer_email: form.customer_email.trim(),
                account_identifier: form.account_identifier.trim() || null,
                reference: form.reference.trim() || null,
            };

            const { data } = await axios.post(`${API}/checkout/session`, payload);
            setCheckoutData(data);
            setCheckoutSuccess(data.message || 'Checkout started successfully.');
        } catch (error) {
            setCheckoutError(error.response?.data?.detail || 'Unable to start checkout right now.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <section className="pricing-section relative z-20" id="pricing">
            {/* ── HEADER ── */}
            <div className="pricing-header">
                <div className="pricing-chip">
                    <svg width="8" height="8" viewBox="0 0 8 8" className="mr-1.5"><circle cx="4" cy="4" r="4" fill="#7c3aed" /></svg>
                    Pricing
                </div>
                <h2 className="pricing-title">Simple pricing.<br /><em>Powerful memory.</em></h2>
                <p className="pricing-sub leading-loose flex flex-wrap justify-center gap-x-1.5 gap-y-2 mt-4">
                    <ScrollMarkerReveal delay={0.4} markerColor="bg-emerald-200 dark:bg-emerald-600/40">Start free, scale as your company&apos;s knowledge grows.</ScrollMarkerReveal>
                    <ScrollMarkerReveal delay={0.6} markerColor="bg-indigo-200 dark:bg-indigo-600/40">Every plan runs 100% on-device — no cloud bills, ever.</ScrollMarkerReveal>
                </p>
            </div>

            {/* ── BILLING TOGGLE ── */}
            <div className="toggle-wrap">
                <span className={`toggle-label ${!isYearly ? 'active' : ''}`} onClick={() => setIsYearly(false)}>Monthly</span>
                <button
                    className={`toggle-switch ${isYearly ? 'yearly' : ''}`}
                    onClick={() => setIsYearly(!isYearly)}
                    aria-label="Toggle billing period"
                ></button>
                <span className={`toggle-label ${isYearly ? 'active' : ''}`} onClick={() => setIsYearly(true)}>
                    Yearly <span className="save-badge">Save 25%</span>
                </span>
            </div>

            {/* ── CARDS ── */}
            <motion.div
                className="pricing-cards-grid"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >

                {/* STARTER */}
                <motion.div
                    className="plan-card starter-card group overflow-hidden"
                    variants={cardVariants}
                    whileHover="hover"
                    {...normalCardHover}
                >
                    <BorderBeam duration={8} size={200} className="from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="plan-icon starter">🌱</div>
                    <div className="plan-name">Starter</div>
                    <div className="plan-desc">Perfect for freelancers and solo founders capturing personal work knowledge.</div>

                    <div className="price-block">
                        <div className="price-amount" style={{ minHeight: '48px', alignItems: 'center' }}>
                            <span className="price-currency">₹</span>
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={isYearly ? 'y' : 'm'}
                                    variants={priceVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.2 }}
                                >
                                    {isYearly ? '3,749' : '4,999'}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                        <div className="price-period">per month · up to 15 users</div>
                        <AnimatePresence>
                            {isYearly && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="price-saving"
                                >
                                    You save ₹15,000/yr
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="card-divider"></div>

                    <ul className="features-list">
                        <li><CheckIcon /> Up to <strong>5,000 memories</strong> stored</li>
                        <li><CheckIcon /> Gmail + Google Drive sync</li>
                        <li><CheckIcon /> Basic Decision DNA</li>
                        <li><CheckIcon /> AMD Ryzen AI — on-device only</li>
                        <li><CheckIcon /> Community support</li>
                        <li><CrossIcon /> <span style={{ opacity: .45 }}>Slack integration</span></li>
                        <li><CrossIcon /> <span style={{ opacity: .45 }}>Onboarding Co-Pilot</span></li>
                    </ul>

                    <button
                        className="plan-cta outline mt-auto"
                        onClick={() => handleSelect('starter')}
                    >
                        {selectedPlan === 'starter' ? '✓ Selected!' : 'Get started free \u2192'}
                    </button>
                    <div className="users-tag">
                        <div className="users-avatars">
                            <div className="user-dot" style={{ background: '#a78bfa' }}>A</div>
                            <div className="user-dot" style={{ background: '#34d399' }}>B</div>
                            <div className="user-dot" style={{ background: '#fb923c' }}>C</div>
                        </div>
                        Up to 15 team members
                    </div>
                </motion.div>


                {/* GROWTH (POPULAR) */}
                <motion.div
                    className="plan-card popular group overflow-hidden"
                    variants={popularCardVariants}
                    whileHover="hover"
                >
                    <BorderBeam duration={8} size={300} reverse className="from-transparent via-purple-500 to-transparent" />
                    <div className="plan-badge">MOST POPULAR</div>
                    <div className="plan-icon growth">🧠</div>
                    <div className="plan-name">Growth</div>
                    <div className="plan-desc">For growing teams that need shared memory, auto-capture, and smart onboarding.</div>

                    <div className="price-block">
                        <div className="price-amount" style={{ minHeight: '48px', alignItems: 'center' }}>
                            <span className="price-currency">₹</span>
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={isYearly ? 'y' : 'm'}
                                    variants={priceVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.2 }}
                                >
                                    {isYearly ? '14,999' : '19,999'}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                        <div className="price-period">per month · up to 100 users</div>
                        <AnimatePresence>
                            {isYearly && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="price-saving"
                                >
                                    You save ₹60,000/yr
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="card-divider"></div>

                    <ul className="features-list">
                        <li><CheckIcon /> <strong>Unlimited memories</strong> stored</li>
                        <li><CheckIcon /> Gmail, Slack, Drive, Notion, Jira</li>
                        <li><CheckIcon /> Full Decision DNA + Expert Finder</li>
                        <li><CheckIcon /> Onboarding Co-Pilot (AI buddy)</li>
                        <li><CheckIcon /> AMD Ryzen AI NPU — full acceleration</li>
                        <li><CheckIcon /> DPDP Act 2023 compliance report</li>
                        <li><CheckIcon /> Priority email support</li>
                    </ul>

                    <button
                        className="plan-cta filled mt-auto"
                        onClick={() => handleSelect('growth')}
                        style={selectedPlan === 'growth' ? { background: 'linear-gradient(135deg,#059669,#10b981)' } : {}}
                    >
                        {selectedPlan === 'growth' ? '✓ Selected!' : 'Start 14-day free trial \u2192'}
                    </button>
                    <div className="users-tag">
                        <div className="users-avatars">
                            <div className="user-dot" style={{ background: '#a78bfa' }}>A</div>
                            <div className="user-dot" style={{ background: '#34d399' }}>B</div>
                            <div className="user-dot" style={{ background: '#fb923c' }}>C</div>
                            <div className="user-dot" style={{ background: '#60a5fa' }}>+</div>
                        </div>
                        Up to 100 team members
                    </div>
                </motion.div>

                {/* ENTERPRISE */}
                <motion.div
                    className="plan-card enterprise-card group overflow-hidden"
                    variants={cardVariants}
                    whileHover="hover"
                    {...normalCardHover}
                >
                    <BorderBeam duration={8} size={200} className="from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="plan-icon enterprise">🏢</div>
                    <div className="plan-name">Enterprise</div>
                    <div className="plan-desc">For large organisations needing total control, custom SLAs, and hardware bundles.</div>

                    <div className="price-block">
                        <div className="price-amount" style={{ fontSize: '42px', minHeight: '48px', alignItems: 'center' }}><span className="price-currency">₹</span>75,000+</div>
                        <div className="price-period">per month · unlimited users with SLA</div>
                    </div>

                    <div className="enterprise-highlight">
                        <span>🤝</span>
                        <span>Includes AMD Ryzen AI hardware bundle + dedicated onboarding engineer</span>
                    </div>

                    <div className="card-divider"></div>

                    <ul className="features-list">
                        <li><CheckIcon /> Everything in Growth</li>
                        <li><CheckIcon /> Dedicated AMD hardware bundle</li>
                        <li><CheckIcon /> SSO + Active Directory + RBAC</li>
                        <li><CheckIcon /> 99.9% SLA + 24/7 dedicated support</li>
                        <li><CheckIcon /> Custom integrations (SAP, Salesforce)</li>
                        <li><CheckIcon /> On-site implementation + training</li>
                        <li><CheckIcon /> Audit logs + compliance dashboard</li>
                    </ul>

                    <button
                        className="plan-cta outline mt-auto"
                        onClick={() => handleSelect('enterprise')}
                    >
                        {selectedPlan === 'enterprise' ? 'Connecting...' : 'Talk to sales \u2192'}
                    </button>
                    <div className="users-tag">Unlimited team members · custom SLA</div>
                </motion.div>

            </motion.div>

            {/* F-21: COMPETITOR TABLE */}
            <CompetitorTable />

            {/* ── BOTTOM TRUST STRIP ── */}
            <motion.div
                className="bottom-strip"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.4, duration: 0.6 }}
            >
                <div className="trust-item">
                    <div className="trust-icon">🔒</div>
                    100% On-Device — Your data never leaves your machine
                </div>
                <div className="trust-item">
                    <div className="trust-icon">🇮🇳</div>
                    DPDP Act 2023 compliant by design
                </div>
                <div className="trust-item">
                    <div className="trust-icon">💳</div>
                    No credit card for free trial
                </div>
                <div className="amd-badge">
                    <svg width="22" height="12" viewBox="0 0 36 20" fill="none">
                        <rect width="36" height="20" rx="3" fill="white" opacity=".15" />
                        <text x="4" y="14" fill="white" fontSize="13" fontWeight="900" fontFamily="Arial">TIT</text>
                    </svg>
                    Hackethon
                </div>
            </motion.div>

            <AnimatePresence>
                {selectedPlan && activePlan ? (
                    <motion.div
                        className="checkout-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="checkout-modal"
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        >
                            <div className="checkout-header">
                                <div>
                                    <div className="checkout-kicker">Checkout</div>
                                    <h3>{activePlan.title} Plan</h3>
                                    <p>
                                        {selectedPlan === 'enterprise'
                                            ? 'Share your contact details and preferred payment mode. We will follow up with a custom proposal.'
                                            : 'Pick a payment method and create your local-first checkout request.'}
                                    </p>
                                </div>
                                <button className="checkout-close" type="button" onClick={() => setSelectedPlan(null)}>×</button>
                            </div>

                            <div className="checkout-summary">
                                <div>
                                    <span>Plan</span>
                                    <strong>{activePlan.title}</strong>
                                </div>
                                <div>
                                    <span>Billing</span>
                                    <strong>{isYearly ? 'Yearly' : 'Monthly'}</strong>
                                </div>
                                <div>
                                    <span>Amount</span>
                                    <strong>{activeAmount ? `₹${activeAmount.toLocaleString('en-IN')}` : 'Custom quote'}</strong>
                                </div>
                            </div>

                            <div className="payment-methods">
                                {(selectedPlan === 'enterprise'
                                    ? [{ id: 'contact', label: 'Contact Sales' }]
                                    : [
                                        { id: 'upi', label: 'UPI' },
                                        { id: 'card', label: 'Card' },
                                        { id: 'netbanking', label: 'Netbanking' },
                                    ]
                                ).map((method) => (
                                    <button
                                        key={method.id}
                                        type="button"
                                        className={`payment-method ${paymentMethod === method.id ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod(method.id)}
                                    >
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            <div className={selectedPlan === 'enterprise' ? 'enterprise-contact' : 'payment-form'}>
                                <div className="payment-grid">
                                    <div className="payment-field">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={form.customer_name}
                                            onChange={(event) => setForm((prev) => ({ ...prev, customer_name: event.target.value }))}
                                            placeholder="Anandam"
                                        />
                                    </div>
                                    <div className="payment-field">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={form.customer_email}
                                            onChange={(event) => setForm((prev) => ({ ...prev, customer_email: event.target.value }))}
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </div>

                                <div className="payment-grid">
                                    <div className="payment-field">
                                        <label>{paymentMethod === 'upi' ? 'UPI ID' : paymentMethod === 'card' ? 'Card Holder / Billing Name' : paymentMethod === 'netbanking' ? 'Bank / Account Name' : 'Company / Team Name'}</label>
                                        <input
                                            type="text"
                                            value={form.account_identifier}
                                            onChange={(event) => setForm((prev) => ({ ...prev, account_identifier: event.target.value }))}
                                            placeholder={paymentMethod === 'upi' ? 'name@upi' : paymentMethod === 'card' ? 'Billing name' : paymentMethod === 'netbanking' ? 'HDFC / ICICI / SBI' : 'ContextOS Labs'}
                                        />
                                    </div>
                                    <div className="payment-field">
                                        <label>{selectedPlan === 'enterprise' ? 'Reference / Requirements' : 'Reference Note'}</label>
                                        <input
                                            type="text"
                                            value={form.reference}
                                            onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                                            placeholder={selectedPlan === 'enterprise' ? 'Seats, SLA, deployment notes' : 'Optional memo'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {checkoutError ? <div className="checkout-success checkout-error">{checkoutError}</div> : null}
                            {checkoutSuccess ? (
                                <div className="checkout-success">
                                    {checkoutSuccess}
                                    {checkoutData?.request_id ? ` Request ID: ${checkoutData.request_id}` : ''}
                                </div>
                            ) : null}

                            <div className="checkout-actions">
                                <button className="checkout-secondary" type="button" onClick={() => setSelectedPlan(null)}>
                                    Cancel
                                </button>
                                <button className="checkout-primary" type="button" onClick={handleCheckout} disabled={checkoutLoading}>
                                    {checkoutLoading
                                        ? 'Submitting...'
                                        : selectedPlan === 'enterprise'
                                            ? 'Send Sales Request'
                                            : `Pay via ${paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Card' : 'Netbanking'}`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
}
