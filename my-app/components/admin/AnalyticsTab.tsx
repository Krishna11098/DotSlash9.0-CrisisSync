"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";
import {
  TrendingUp,
  Users,
  Calendar,
  Target,
  Phone,
  Activity,
  Award,
  Clock,
  BarChart3,
  PieChart,
  AlertCircle,
} from "lucide-react";
import { fetchAllEvents } from "@/lib/admin-api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  eventOverview: {
    totalEvents: number;
    activeEvents: number;
    upcomingEvents: number;
    completedEvents: number;
  };
  contactStatus: {
    met: number;
    followUp: number;
    engaged: number;
    meetingScheduled: number;
    meetingCompleted: number;
    converted: number;
    lost: number;
    total: number;
  };
  leadQuality: {
    highIntent: number;
    mediumIntent: number;
    lowIntent: number;
    withAudioNotes: number;
    completeDetails: number;
    incompleteDetails: number;
  };
  captureMode: {
    stall: number;
    field: number;
  };
  entryType: {
    manual: number;
    scanned: number;
  };
  teamPerformance: Array<{
    name: string;
    totalCaptures: number;
    meetingsBooked: number;
    followUpsCompleted: number;
    conversions: number;
    followUpRate: string;
  }>;
  eventWiseBreakdown: Array<{
    eventId: string;
    eventName: string;
    eventCode: string;
    totalContacts: number;
    stallCaptures: number;
    fieldCaptures: number;
    conversions: number;
    meetings: number;
    conversionRate: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  timeBasedTrends: Array<{
    date: string;
    captures: number;
    conversions: number;
  }>;
  peakCaptureHours: Array<{
    hour: number;
    count: number;
    label: string;
  }>;
  conversionFunnel: {
    met: number;
    followUp: number;
    engaged: number;
    meetingScheduled: number;
    converted: number;
  };
}

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsRes, eventsData] = await Promise.all([
          fetch(`/api/analytics${selectedEvent !== "all" ? `?event_id=${selectedEvent}` : ""}`),
          fetchAllEvents(),
        ]);

        if (!analyticsRes.ok) {
          throw new Error(`HTTP error! status: ${analyticsRes.status}`);
        }

        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-600">Failed to load analytics data</p>
      </div>
    );
  }

  const conversionRate = analytics.contactStatus.total > 0
    ? ((analytics.contactStatus.converted / analytics.contactStatus.total) * 100).toFixed(1)
    : "0";

  const meetingRate = analytics.contactStatus.total > 0
    ? (((analytics.contactStatus.meetingScheduled + analytics.contactStatus.meetingCompleted) / analytics.contactStatus.total) * 100).toFixed(1)
    : "0";

  // Chart configurations
  const contactStatusData = {
    labels: ["Met", "Follow-up", "Engaged", "Meeting Scheduled", "Meeting Done", "Converted", "Lost"],
    datasets: [
      {
        label: "Contacts by Stage",
        data: [
          analytics.contactStatus.met,
          analytics.contactStatus.followUp,
          analytics.contactStatus.engaged,
          analytics.contactStatus.meetingScheduled,
          analytics.contactStatus.meetingCompleted,
          analytics.contactStatus.converted,
          analytics.contactStatus.lost,
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(99, 102, 241, 0.8)",
          "rgba(6, 182, 212, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const leadQualityData = {
    labels: ["High Intent", "Medium Intent", "Low Intent"],
    datasets: [
      {
        label: "Lead Quality Distribution",
        data: [
          analytics.leadQuality.highIntent,
          analytics.leadQuality.mediumIntent,
          analytics.leadQuality.lowIntent,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(148, 163, 184, 0.8)",
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const captureModeData = {
    labels: ["Stall Capture", "Field Capture"],
    datasets: [
      {
        label: "Capture Mode",
        data: [analytics.captureMode.stall, analytics.captureMode.field],
        backgroundColor: ["rgba(59, 130, 246, 0.8)", "rgba(168, 85, 247, 0.8)"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const timeBasedTrendsData = {
    labels: analytics.timeBasedTrends.map((t) => new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
    datasets: [
      {
        label: "Captures",
        data: analytics.timeBasedTrends.map((t) => t.captures),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Conversions",
        data: analytics.timeBasedTrends.map((t) => t.conversions),
        borderColor: "rgba(34, 197, 94, 1)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const peakHoursData = {
    labels: analytics.peakCaptureHours.map((h) => h.label),
    datasets: [
      {
        label: "Captures by Hour",
        data: analytics.peakCaptureHours.map((h) => h.count),
        backgroundColor: "rgba(168, 85, 247, 0.8)",
        borderColor: "rgba(168, 85, 247, 1)",
        borderWidth: 2,
      },
    ],
  };

  const teamPerformanceData = {
    labels: analytics.teamPerformance.map((t) => t.name),
    datasets: [
      {
        label: "Total Captures",
        data: analytics.teamPerformance.map((t) => t.totalCaptures),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
      },
      {
        label: "Meetings Booked",
        data: analytics.teamPerformance.map((t) => t.meetingsBooked),
        backgroundColor: "rgba(168, 85, 247, 0.8)",
      },
      {
        label: "Conversions",
        data: analytics.teamPerformance.map((t) => t.conversions),
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
    ],
  };

  const conversionFunnelData = {
    labels: ["Met", "Follow-up+", "Engaged+", "Meeting+", "Converted"],
    datasets: [
      {
        label: "Conversion Funnel",
        data: [
          analytics.conversionFunnel.met,
          analytics.conversionFunnel.followUp,
          analytics.conversionFunnel.engaged,
          analytics.conversionFunnel.meetingScheduled,
          analytics.conversionFunnel.converted,
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(6, 182, 212, 0.8)",
          "rgba(34, 197, 94, 0.8)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header with Event Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} ({event.event_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-100 dark:border-blue-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {analytics.contactStatus.total}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all events</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-100 dark:border-green-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {conversionRate}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.contactStatus.converted} conversions
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100 dark:border-purple-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Meeting Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {meetingRate}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.contactStatus.meetingScheduled + analytics.contactStatus.meetingCompleted} meetings
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-100 dark:border-orange-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Pending Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {analytics.contactStatus.followUp}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Status & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Contact Status Breakdown
            </CardTitle>
            <CardDescription>Distribution across pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={contactStatusData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Lead progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={conversionFunnelData} options={{
                ...chartOptions,
                indexAxis: 'y' as const,
              }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Quality & Capture Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Lead Quality
            </CardTitle>
            <CardDescription>Intent distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <Doughnut data={leadQualityData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              Capture Mode Split
            </CardTitle>
            <CardDescription>Stall vs Field captures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <Pie data={captureModeData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Complete Details</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {analytics.leadQuality.completeDetails}
                </Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${(analytics.leadQuality.completeDetails / analytics.contactStatus.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">With Audio Notes</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {analytics.leadQuality.withAudioNotes}
                </Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(analytics.leadQuality.withAudioNotes / analytics.contactStatus.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Incomplete Details</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {analytics.leadQuality.incompleteDetails}
                </Badge>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full"
                  style={{
                    width: `${(analytics.leadQuality.incompleteDetails / analytics.contactStatus.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Time-based Trends
          </CardTitle>
          <CardDescription>Daily captures and conversions (Last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={timeBasedTrendsData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Peak Capture Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Peak Capture Hours
          </CardTitle>
          <CardDescription>When most contacts are captured during events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar data={peakHoursData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      {analytics.teamPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Team Performance
            </CardTitle>
            <CardDescription>Member-wise capture and conversion statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mb-6">
              <Bar data={teamPerformanceData} options={chartOptions} />
            </div>

            {/* Team Performance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Team Member</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Total Captures</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Meetings</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Follow-ups</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Conversions</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Follow-up Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.teamPerformance.map((member, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="py-3 px-4 font-medium">{member.name}</td>
                      <td className="text-center py-3 px-4">{member.totalCaptures}</td>
                      <td className="text-center py-3 px-4">{member.meetingsBooked}</td>
                      <td className="text-center py-3 px-4">{member.followUpsCompleted}</td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {member.conversions}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">{member.followUpRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Event-wise Performance Comparison
          </CardTitle>
          <CardDescription>Contact captures and conversions by event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Event</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Total Contacts</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Stall</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Field</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Meetings</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Conversions</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.eventWiseBreakdown.map((event, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{event.eventName}</div>
                        <div className="text-xs text-slate-500">{event.eventCode}</div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          event.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : event.status === "upcoming"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }
                      >
                        {event.status}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-4 font-semibold">{event.totalContacts}</td>
                    <td className="text-center py-3 px-4">{event.stallCaptures}</td>
                    <td className="text-center py-3 px-4">{event.fieldCaptures}</td>
                    <td className="text-center py-3 px-4">{event.meetings}</td>
                    <td className="text-center py-3 px-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {event.conversions}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-4 font-semibold text-green-600">
                      {event.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
