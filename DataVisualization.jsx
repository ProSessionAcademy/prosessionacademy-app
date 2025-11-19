import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export function DataVisualization({ data, type = "bar", title, description }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={data.values}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.values.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.values}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "bar": return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case "pie": return <PieChart className="w-5 h-5 text-purple-600" />;
      case "line": return <TrendingUp className="w-5 h-5 text-green-600" />;
      default: return <BarChart3 className="w-5 h-5" />;
    }
  };

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getIcon()}
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-slate-600 mt-2">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-inner">
          {renderChart()}
        </div>

        {/* Data Table */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h4 className="font-semibold text-slate-900 mb-3">Data Summary</h4>
          <div className="space-y-2">
            {data.values.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-slate-900">{item.name}</span>
                </div>
                <Badge className="bg-slate-700">{item.value}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        {data.insights && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg border-2 border-blue-300">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Key Insights
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              {data.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DataVisualization;