"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { FileText, TrendingUp, Calendar, DollarSign, BarChart3, Loader2 } from "lucide-react"
import { getCustomerRejectionAnalytics } from "@/app/actions"

interface AnalyticsData {
  departmentTotals: { [key: string]: { total: number; count: number; submissions: any[] } }
  grandTotal: number
  totalSubmissions: number
  monthlyData: { [key: string]: number }
  dateRange: { fromDate?: string; toDate?: string }
}

export default function FormsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [isFiltering, setIsFiltering] = useState(false)

  // Dummy forms data for now
  const availableForms = [
    {
      id: "dummy-form-id-1",
      name: "Customer Rejection",
      slug: "customer-rejection",
      description: "Form for recording customer rejections and complaints.",
    },
  ]

  const fetchAnalytics = async (from?: string, to?: string) => {
    setIsFiltering(true)
    try {
      const result = await getCustomerRejectionAnalytics(from, to)
      console.log("Analytics result:", result)

      if (result.error) {
        console.error("Analytics error:", result.error)
        // Set empty analytics data instead of null
        setAnalytics({
          departmentTotals: {},
          grandTotal: 0,
          totalSubmissions: 0,
          monthlyData: {},
          dateRange: { fromDate: from, toDate: to },
        })
      } else {
        setAnalytics(result as AnalyticsData)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      // Set empty analytics data instead of null
      setAnalytics({
        departmentTotals: {},
        grandTotal: 0,
        totalSubmissions: 0,
        monthlyData: {},
        dateRange: { fromDate: from, toDate: to },
      })
    } finally {
      setLoading(false)
      setIsFiltering(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleDateFilter = () => {
    fetchAnalytics(fromDate || undefined, toDate || undefined)
  }

  const handleClearFilter = () => {
    setFromDate("")
    setToDate("")
    fetchAnalytics()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IQD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDepartmentColor = (index: number) => {
    const colors = [
      "bg-red-100 text-red-800",
      "bg-orange-100 text-orange-800",
      "bg-yellow-100 text-yellow-800",
      "bg-green-100 text-green-800",
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-pink-100 text-pink-800",
      "bg-gray-100 text-gray-800",
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableForms.length > 0 ? (
          availableForms.map((form) => (
            <Card key={form.id} className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {form.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">{form.description}</p>

                {/* Date Filter Controls */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" />
                    <Label className="font-medium">Filter by Date Range</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="fromDate" className="text-xs">
                        From Date
                      </Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="toDate" className="text-xs">
                        To Date
                      </Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={handleDateFilter} disabled={isFiltering} size="sm">
                        {isFiltering && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Apply Filter
                      </Button>
                      <Button onClick={handleClearFilter} variant="outline" size="sm">
                        Clear
                      </Button>
                    </div>
                  </div>
                  {analytics?.dateRange && (analytics.dateRange.fromDate || analytics.dateRange.toDate) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Showing data from{" "}
                      {analytics.dateRange.fromDate
                        ? new Date(analytics.dateRange.fromDate).toLocaleDateString()
                        : "beginning"}{" "}
                      to{" "}
                      {analytics.dateRange.toDate ? new Date(analytics.dateRange.toDate).toLocaleDateString() : "now"}
                    </div>
                  )}
                </div>

                {/* Analytics Display */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading analytics...</span>
                  </div>
                ) : analytics ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Total Rejections</p>
                            <p className="text-2xl font-bold text-blue-700">{formatCurrency(analytics.grandTotal)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Total Submissions</p>
                            <p className="text-2xl font-bold text-green-700">{analytics.totalSubmissions}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-purple-900">Departments Affected</p>
                            <p className="text-2xl font-bold text-purple-700">
                              {Object.keys(analytics.departmentTotals).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Department Breakdown */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Rejections by Department
                      </h4>
                      {Object.keys(analytics.departmentTotals).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(analytics.departmentTotals).map(([department, data], index) => (
                            <div key={department} className="bg-white border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getDepartmentColor(index)}>{department}</Badge>
                                <span className="text-xs text-muted-foreground">{data.count} submissions</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold">{formatCurrency(data.total)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {((data.total / analytics.grandTotal) * 100).toFixed(1)}% of total
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${(data.total / analytics.grandTotal) * 100}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No rejection data available for the selected period.
                        </p>
                      )}
                    </div>

                    {/* Monthly Breakdown */}
                    {Object.keys(analytics.monthlyData).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Monthly Breakdown
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(analytics.monthlyData)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([month, total]) => (
                                <div key={month} className="bg-gray-50 p-3 rounded-lg text-center">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {new Date(month + "-01").toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                    })}
                                  </p>
                                  <p className="text-sm font-bold">{formatCurrency(total)}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No analytics data available</p>
                    <p className="text-sm">Submit some forms to see rejection analytics</p>
                  </div>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link href={`/forms/${form.slug}`} passHref>
                    <Button variant="outline" className="flex-1">
                      View Submissions
                    </Button>
                  </Link>
                  <Link href={`/forms/${form.slug}/new`} passHref>
                    <Button className="flex-1">Create New</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">No forms available.</p>
        )}
      </div>
    </div>
  )
}
