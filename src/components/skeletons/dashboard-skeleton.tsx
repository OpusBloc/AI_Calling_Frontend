import { Bot, Phone, PhoneForwarded } from "lucide-react";
import { StatCardSkeleton } from "./card-skeleton";
import { ChartSkeleton } from "./chart-skeleton";
import { RouteSkeleton } from "./skeleton";
import { TableSkeleton } from "./table-skeleton";
import { DASHBOARD_CAMPAIGN_COLUMNS } from "./table-columns";

export function DashboardSkeleton() {
  const cards = [
    { title: "Campaigns", icon: <span className="text-blue-600">↗</span> },
    { title: "Agents", icon: <Bot size={18} className="text-blue-600" /> },
    { title: "Transfer agents", icon: <PhoneForwarded size={18} className="text-emerald-600" /> },
    { title: "Caller numbers", icon: <Phone size={18} className="text-amber-600" /> },
  ];

  return (
    <RouteSkeleton>
      <div className="space-y-8">
        <section>
          <h2 className="mb-5 text-lg font-semibold text-heading">Analytics</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => (
              <StatCardSkeleton key={card.title} title={card.title} icon={card.icon} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-heading">Cost overview</h2>
          <ChartSkeleton />
        </section>
        <section className="rounded-lg border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline p-4">
            <h2 className="text-sm font-semibold text-heading">Recent campaigns</h2>
            <span className="text-sm text-blue-600">View all</span>
          </div>
          <table className="w-full">
            <thead className="sr-only">
              <tr>{DASHBOARD_CAMPAIGN_COLUMNS.map((column) => <th key={column.label}>{column.label}</th>)}</tr>
            </thead>
            <tbody><TableSkeleton columns={DASHBOARD_CAMPAIGN_COLUMNS} rows={4} /></tbody>
          </table>
        </section>
      </div>
    </RouteSkeleton>
  );
}
