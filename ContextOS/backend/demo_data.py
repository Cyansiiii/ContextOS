
from ai_engine import store_memory

demo_memories = [
    {
        "text": "Board meeting March 2024: We decided to terminate our contract with AgencyX marketing. Reasons: 3 missed deadlines, ROI was only 12% vs promised 40%, CEO Rahul made final call. Alternative considered was AgencyY but budget was the constraint.",
        "metadata": {"source": "meeting_notes", "date": "2024-03-15", "type": "decision"}
    },
    {
        "text": "Email from CTO Priya - April 2024: We are switching from AWS to Azure because of Microsoft's special startup pricing offer — saving us ₹8 lakhs annually. Team was divided but cost won the argument.",
        "metadata": {"source": "email", "date": "2024-04-02", "type": "decision"}
    },
    {
        "text": "HR Update Q2: Standard timeframe for onboarding new employees is 3-5 business days. Required approvals involve IT support for device provisioning and HR management for background checks.",
        "metadata": {"source": "document", "date": "2024-02-10", "type": "policy"}
    },
    {
        "text": "Product Meeting Feb 2024: The new frontend architecture will use React 18 and Tailwind CSS v3 due to lack of Node 20 support in our current pipelines. Approved by Lead Architect Dev.",
        "metadata": {"source": "meeting_notes", "date": "2024-02-28", "type": "decision"}
    },
    {
        "text": "Slack message from Security: The latest Stripe payment API integration with passkey authentication was deployed on staging yesterday. Awaiting QA signoff before moving to production.",
        "metadata": {"source": "slack_message", "date": "2024-05-10", "type": "update"}
    },
    {
        "text": "Sales Team Update: Priya is assigned as the lead for the Acme Corp enterprise renewal contract worth $500k. Dev is supporting on technical validation.",
        "metadata": {"source": "slack_message", "date": "2024-05-12", "type": "update"}
    },
    {
        "text": "Q3 Marketing Budget Allocation: Paid search ads are allocated $50k, social media ads get $30k, and SEO content gets $20k. Approved by CMO.",
        "metadata": {"source": "document", "date": "2024-06-01", "type": "budget"}
    },
    {
        "text": "Security Review Process: All new vendor tools must undergo a security review initiated via Jira 'Security Review Intake Form'. Turnaround is typical 5 days.",
        "metadata": {"source": "document", "date": "2024-01-15", "type": "policy"}
    },
    {
        "text": "Employee remote work policy 2024: Employees are allowed to work remotely 3 days a week. Core hours are 10 AM to 3 PM EST. Thursdays are mandatory in-office.",
        "metadata": {"source": "document", "date": "2024-01-20", "type": "policy"}
    },
    {
        "text": "Engineering all-hands: We are standardizing on FastAPI for all new Python microservices. Flask is deprecated. Reason: Better async support and automatic swagger docs.",
        "metadata": {"source": "meeting_notes", "date": "2024-03-05", "type": "decision"}
    },
    {
        "text": "Decision on Vector DB: We initially tested Pinecone but switched to ChromaDB for the ContextOS project because it runs locally, aligns with our zero data retention security policy, and integrates easily with LangChain.",
        "metadata": {"source": "decision", "date": "2024-04-18", "type": "decision"}
    },
    {
        "text": "Customer Success notes: BigRetail client escalated issue #3422 regarding slow report generation. Fix deployed on May 1st by the optimization team. Issue resolved.",
        "metadata": {"source": "meeting_notes", "date": "2024-05-02", "type": "update"}
    },
    {
        "text": "Email from CEO - Company Holiday: Friday, July 5th will be a company-wide day off this year to extend the holiday weekend. Enjoy the downtime.",
        "metadata": {"source": "email", "date": "2024-06-15", "type": "announcement"}
    },
    {
        "text": "Slack message from DevOps: Production database maintenance scheduled for this Saturday at 2 AM PST. Downtime expected to be under 15 minutes.",
        "metadata": {"source": "slack_message", "date": "2024-06-20", "type": "update"}
    },
    {
        "text": "Q1 Performance Review: ContextOS platform adoption increased by 40% internally. Reduced average support ticket resolution time by 2.5 hours.",
        "metadata": {"source": "decision", "date": "2024-04-10", "type": "metrics"}
    }
]

print("Filling ContextOS with demo data...")
total = len(demo_memories)
for i, memory in enumerate(demo_memories, 1):
    print(f"[{i}/{total}] Embedding: {memory['text'][:60]}...")
    store_memory(memory["text"], memory["metadata"])
    print(f"[{i}/{total}] ✓ Done")
print("\n✅ ContextOS AI brain is ready with all demo memories!")
