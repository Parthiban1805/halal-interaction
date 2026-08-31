import React, { useEffect, useState } from "react";
import { Plus, IndianRupee, TrendingDown, TrendingUp, Filter, Trash2, Edit2, Download } from "lucide-react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, WidthType } from "docx";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import CustomSelect from "../components/ui/CustomSelect";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import CustomMonthPicker from '../components/ui/CustomMonthPicker';
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function PLDashboard() {
  const { token, user } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Other");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, target: null });
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (["admin", "superadmin"].includes(user?.role)) {
      fetchPLData();
    }
  }, [user, selectedMonth]);

  const fetchPLData = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(year, parseInt(month), 0).toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD

      let plUrl = `${API_URL}/api/pl/summary?startDate=${start}&endDate=${end}`;
      let revUrl = `${API_URL}/api/analytics/revenue?startDate=${start}&endDate=${end}`;
      let salaryUrl = `${API_URL}/api/salary?month=${selectedMonth}`;
      
      const [plRes, revRes, salaryRes] = await Promise.all([
        fetch(plUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(revUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(salaryUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (plRes.ok && revRes.ok && salaryRes.ok) {
        const plJson = await plRes.json();
        const revJson = await revRes.json();
        const salaryJson = await salaryRes.json();

        // Calculate totals using Revenue endpoint (matches RevenueDashboard, exc. GST)
        const totalRevenue = revJson.totalRevenueExclusive || 0;
        
        // Sum external expenses from PL endpoint
        const externalExpensesList = plJson.data?.externalExpensesList || [];
        const totalExternalExpenses = externalExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const plExpenses = plJson.data?.expenseBreakdown || [];
        
        let totalSalaries = 0;
        let totalIncentives = 0;
        
        if (salaryJson.success && salaryJson.data) {
          salaryJson.data.forEach(agent => {
            totalSalaries += (agent.baseSalary || 0);
            totalIncentives += (agent.calculatedIncentive || 0);
          });
        } else {
          totalSalaries = plExpenses.find(e => e.category === 'Salaries')?.amount || 0;
          totalIncentives = plExpenses.find(e => e.category === 'Incentives')?.amount || 0;
        }

        const totalEventExpenses = plExpenses.find(e => e.category === 'Event Expenses')?.amount || 0;

        const totalExpense = totalSalaries + totalIncentives + totalEventExpenses + totalExternalExpenses;
        const netProfit = totalRevenue - totalExpense;
        
        // Group external expenses by category
        const extCategoryMap = {};
        externalExpensesList.forEach(e => {
          extCategoryMap[e.category] = (extCategoryMap[e.category] || 0) + (e.amount || 0);
        });
        
        const extBreakdown = Object.keys(extCategoryMap).map(cat => ({
          category: cat,
          amount: extCategoryMap[cat]
        }));

        setData({
          totals: {
            revenue: totalRevenue,
            expense: totalExpense,
            netProfit
          },
          externalExpensesList,
          revenueBreakdown: [
            { category: 'New Membership Revenue', amount: revJson.membershipRevenueExclusive || 0 },
            { category: 'Membership Renewal Revenue', amount: revJson.renewalRevenueExclusive || 0 },
            { category: 'Event Registration', amount: revJson.eventRevenueExclusive || 0 }
          ],
          expenseBreakdown: [
            { category: 'Salaries', amount: totalSalaries },
            { category: 'Incentives', amount: totalIncentives },
            { category: 'Event Expenses', amount: totalEventExpenses },
            ...extBreakdown
          ]
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load P&L data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount || !expenseDate || !expenseCategory) return;
    setConfirmDialog({ isOpen: true, action: "save", target: null });
  };

  const executeSave = async () => {
    setSavingExpense(true);
    try {
      const url = editingExpenseId 
        ? `${API_URL}/api/pl/external-expenses/${editingExpenseId}`
        : `${API_URL}/api/pl/external-expenses`;
      const method = editingExpenseId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: expenseTitle,
          amount: Number(expenseAmount),
          date: expenseDate,
          category: expenseCategory,
          description: expenseDescription
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save expense");
      
      toast.success(editingExpenseId ? "Expense updated" : "External expense added successfully");
      setIsModalOpen(false);
      resetForm();
      fetchPLData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingExpense(false);
      setConfirmDialog({ isOpen: false, action: null, target: null });
    }
  };
  
  const resetForm = () => {
    setEditingExpenseId(null);
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseDate("");
    setExpenseCategory("Other");
    setExpenseDescription("");
  };

  const handleEditClick = (expense) => {
    setEditingExpenseId(expense._id);
    setExpenseTitle(expense.title);
    setExpenseAmount(expense.amount);
    setExpenseDate(new Date(expense.date).toISOString().split('T')[0]);
    setExpenseCategory(expense.category);
    setExpenseDescription(expense.description || "");
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!confirmDialog.target) return;
    try {
      const res = await fetch(`${API_URL}/api/pl/external-expenses/${confirmDialog.target._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete expense");
      toast.success("Expense deleted successfully");
      fetchPLData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmDialog({ isOpen: false, action: null, target: null });
    }
  };

  const MetricCard = ({ title, value, icon: Icon, isNegative }) => (
    <div className="card-panel p-6 flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className={`text-2xl font-bold tracking-tight ${
          isNegative === undefined 
            ? 'text-[var(--color-text-main)]' 
            : isNegative 
              ? 'text-[var(--color-status-error)]' 
              : 'text-[var(--color-text-main)]'
        }`}>
          ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
      </div>
    </div>
  );

  const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getExportData = () => {
    if (!data) return null;
    return {
      revenue: data.totals.revenue,
      expense: data.totals.expense,
      netProfit: data.totals.netProfit,
      revBreakdown: data.revenueBreakdown || [],
      expBreakdown: data.expenseBreakdown || []
    };
  };

  const exportCSV = () => {
    const d = getExportData();
    if (!d) return;
    
    const cleanCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    let csvContent = "Expense,Amount,Income,Rs\n";
    
    const expRows = d.expBreakdown;
    const revRows = d.revBreakdown;
    
    const maxRows = Math.max(expRows.length, revRows.length);
    
    for (let i = 0; i < maxRows; i++) {
      const expName = expRows[i] ? cleanCSV(expRows[i].category) : "";
      const expAmt = expRows[i] ? expRows[i].amount : "";
      
      const revName = revRows[i] ? cleanCSV(revRows[i].category) : "";
      const revAmt = revRows[i] ? revRows[i].amount : "";
      
      csvContent += `${expName},${expAmt},${revName},${revAmt}\n`;
    }
    
    // Net profit balancing row
    if (d.netProfit >= 0) {
      csvContent += `"Net Profit",${d.netProfit},,\n`;
    } else {
      csvContent += `,,Net Loss,${Math.abs(d.netProfit)}\n`;
    }
    
    // Final balancing total
    const grandTotal = Math.max(d.revenue, d.expense);
    csvContent += ` ,${grandTotal}, ,${grandTotal}\n`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `PL_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportTXT = () => {
    const d = getExportData();
    if (!d) return;
    
    let txtContent = `PROFIT & LOSS REPORT\nDate: ${new Date().toLocaleDateString()}\n\n`;
    txtContent += `--- SUMMARY ---\n`;
    txtContent += `Total Revenue: ${formatCurrency(d.revenue)}\n`;
    txtContent += `Total Expense: ${formatCurrency(d.expense)}\n`;
    txtContent += `Net Profit: ${formatCurrency(d.netProfit)}\n\n`;
    
    txtContent += `--- REVENUE BREAKDOWN ---\n`;
    d.revBreakdown.forEach(item => {
      txtContent += `${item.category}: ${formatCurrency(item.amount)}\n`;
    });
    
    txtContent += `\n--- EXPENSE BREAKDOWN ---\n`;
    d.expBreakdown.forEach(item => {
      txtContent += `${item.category}: ${formatCurrency(item.amount)}\n`;
    });
    
    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
    saveAs(blob, `PL_Report_${new Date().toISOString().split('T')[0]}.txt`);
  };

  const exportPDF = () => {
    const d = getExportData();
    if (!d) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Profit & Loss Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Revenue', formatCurrency(d.revenue)],
        ['Total Expense', formatCurrency(d.expense)],
        ['Net Profit', formatCurrency(d.netProfit)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Revenue Breakdown', 'Amount']],
      body: d.revBreakdown.map(item => [item.category, formatCurrency(item.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] }
    });
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Expense Breakdown', 'Amount']],
      body: d.expBreakdown.map(item => [item.category, formatCurrency(item.amount)]),
      theme: 'grid',
      headStyles: { fillColor: [192, 57, 43] }
    });
    
    doc.save(`PL_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportDOCX = async () => {
    const d = getExportData();
    if (!d) return;
    
    const createRow = (col1, col2, isHeader = false) => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col1, bold: isHeader })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col2, bold: isHeader })] })] })
        ]
      });
    };
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: "Profit & Loss Report", bold: true, size: 36 })] }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}` })] }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: "Summary", bold: true, size: 28 })] }),
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow("Metric", "Amount", true),
              createRow("Total Revenue", formatCurrency(d.revenue)),
              createRow("Total Expense", formatCurrency(d.expense)),
              createRow("Net Profit", formatCurrency(d.netProfit))
            ]
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: "Revenue Breakdown", bold: true, size: 28 })] }),
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow("Category", "Amount", true),
              ...d.revBreakdown.map(item => createRow(item.category, formatCurrency(item.amount)))
            ]
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({ children: [new TextRun({ text: "Expense Breakdown", bold: true, size: 28 })] }),
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createRow("Category", "Amount", true),
              ...d.expBreakdown.map(item => createRow(item.category, formatCurrency(item.amount)))
            ]
          })
        ]
      }]
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `PL_Report_${new Date().toISOString().split('T')[0]}.docx`);
  };

  if (!["admin", "superadmin"].includes(user?.role)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center h-full text-[var(--color-text-muted)] fade-in">
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">Access Denied</h2>
        <p className="max-w-md">You do not have permission to access the P&L Dashboard.</p>
      </div>
    );
  }

  const revenueColumns = [
    { label: "Category", key: "category", render: (item) => <span className="font-semibold">{item.category}</span> },
    { label: "Amount", key: "amount", className: "text-left", render: (item) => <span className="font-semibold text-[var(--color-text-muted)]">₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> }
  ];

  const expenseColumns = [
    { label: "Category", key: "category", render: (item) => <span className="font-semibold">{item.category}</span> },
    { label: "Amount", key: "amount", className: "text-left", render: (item) => <span className="font-semibold text-[var(--color-text-muted)]">₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> }
  ];

  return (
    <div className="fade-in space-y-4 pb-20 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-main)]">
            P&L Dashboard
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Track Profit and Loss Overview
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CustomMonthPicker
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="text-sm font-semibold whitespace-nowrap"
                icon={Download}
              >
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  <button onClick={() => { exportPDF(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] font-medium transition-colors">Export PDF</button>
                  <button onClick={() => { exportDOCX(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] font-medium transition-colors">Export DOCX</button>
                  <button onClick={() => { exportCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] font-medium transition-colors">Export CSV</button>
                  <button onClick={() => { exportTXT(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] font-medium transition-colors">Export TXT</button>
                </div>
              )}
            </div>

            <Button 
              onClick={() => { resetForm(); setIsModalOpen(true); }} 
              className="text-sm font-semibold whitespace-nowrap" 
              icon={Plus}
            >
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {/* Top Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-4 w-32" />
                </div>
                <div className="flex flex-col gap-1">
                  <Skeleton variant="text" className="h-8 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown Tables Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-2">
            <div className="flex flex-col overflow-hidden">
              <Skeleton variant="text" className="h-6 w-48 mb-4" />
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
                <TableSkeleton rows={4} columns={2} />
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <Skeleton variant="text" className="h-6 w-48 mb-4" />
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
                <TableSkeleton rows={4} columns={2} />
              </div>
            </div>
          </div>

          {/* Detailed External Expenses Skeleton */}
          <div className="flex flex-col overflow-hidden mt-2">
            <Skeleton variant="text" className="h-6 w-64 mb-4" />
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
              <TableSkeleton rows={5} columns={4} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
              title="Total Revenue" 
              value={data?.totals?.revenue} 
              isNegative={false} 
            />
            <MetricCard 
              title="Total Expense" 
              value={data?.totals?.expense} 
              isNegative={true} 
            />
            <MetricCard 
              title="Net Profit / Loss" 
              value={data?.totals?.netProfit} 
              isNegative={data?.totals?.netProfit < 0} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
            <div className="flex flex-col fade-in overflow-hidden">
              <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                      Revenue Breakdown
                    </h2>
                  </div>
                </div>
              </div>
              <Table 
                columns={revenueColumns} 
                data={data?.revenueBreakdown || []} 
                keyField="category" 
              />
            </div>
            
            <div className="flex flex-col fade-in overflow-hidden">
              <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                      Expense Breakdown
                    </h2>
                  </div>
                </div>
              </div>
              <Table 
                columns={expenseColumns} 
                data={data?.expenseBreakdown || []} 
                keyField="category" 
              />
            </div>
          </div>
          
          <div className="flex flex-col fade-in overflow-hidden mt-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                    Detailed External Expenses
                  </h2>
                </div>
              </div>
            </div>
              <Table 
                columns={[
                  { label: "Date", key: "date", render: (item) => new Date(item.date).toLocaleDateString() },
                  { label: "Title", key: "title", render: (item) => <span className="font-semibold">{item.title}</span> },
                  { label: "Category", key: "category", render: (item) => <span className="text-[var(--color-text-muted)]">{item.category}</span> },
                  { label: "Added By", key: "createdBy", render: (item) => <span className="text-[var(--color-text-muted)] text-sm">{item.createdBy?.name || "Unknown"}</span> },
                  { label: "Amount", key: "amount", className: "font-bold text-[var(--color-status-error)]", render: (item) => `₹${Number(item.amount || 0).toLocaleString('en-IN')}` },
                  { label: "Action", key: "actions", className: "w-[100px]", render: (item) => (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-light)] hover:text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setConfirmDialog({ isOpen: true, action: 'delete', target: item })}
                        className="p-1.5 hover:bg-red-50 text-[var(--color-text-light)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                ]}
                data={data?.externalExpensesList || []} 
                keyField="_id" 
              />
            </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpenseId ? "Edit External Expense" : "Add External Expense"}
      >
        <form onSubmit={handleSaveClick} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              Expense Title
            </label>
            <input
              type="text"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="e.g. Office Supplies"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="e.g. 5000"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              Category
            </label>
            <CustomSelect
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              options={[
                { value: "Marketing", label: "Marketing" },
                { value: "Software", label: "Software" },
                { value: "Rent", label: "Rent" },
                { value: "Travel", label: "Travel" },
                { value: "Office Supplies", label: "Office Supplies" },
                { value: "Consulting", label: "Consulting" },
                { value: "Other", label: "Other" },
              ]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="Additional details..."
              rows={3}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingExpense}>
              {editingExpenseId ? "Save Changes" : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, target: null })}
        onConfirm={confirmDialog.action === 'delete' ? executeDelete : executeSave}
        title={confirmDialog.action === 'delete' ? "Delete Expense" : "Save Expense"}
        message={
          confirmDialog.action === 'delete'
            ? `Are you sure you want to delete the expense "${confirmDialog.target?.title}"? This cannot be undone.`
            : `Are you sure you want to save this expense?`
        }
        confirmText={confirmDialog.action === 'delete' ? "Delete" : "Save"}
        isDestructive={confirmDialog.action === 'delete'}
      />
    </div>
  );
}
