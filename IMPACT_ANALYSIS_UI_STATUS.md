# Impact Analysis & Scenario UI Status Report

## ✅ What Users CAN See Right Now

### 1. **Impact Badges on Career Cards** ✅
- **Location**: Careers Dashboard (`/intelligence` → Careers tab)
- **What it shows**: 
  - Impact count badge (e.g., "3 impacts")
  - High severity indicator (red badge if high-severity impacts exist)
  - Net jobs affected (e.g., "+500 jobs" or "-200 jobs")
- **Status**: ✅ **WORKING** - Fetches real impacts from graph-query API
- **Code**: `src/components/intelligence/CareersDashboard.tsx` (lines 689-694)

### 2. **Impact Badges on Funding Allocations** ✅
- **Location**: Funding Dashboard (`/intelligence` → Funding tab)
- **What it shows**: Same as career badges
- **Status**: ✅ **WORKING** - Fetches real impacts for sectors
- **Code**: `src/components/intelligence/FundingDashboard.tsx` (lines 122-128)

### 3. **Impact Scenario Modeling Panel** ✅
- **Location**: Overview Tab (`/intelligence` → Overview)
- **What it shows**: 
  - Interactive scenario modeler
  - Input fields for entity, policy, and change percentage
  - Results display after simulation
- **Status**: ✅ **VISIBLE** - Panel is added to dashboard
- **Code**: `src/pages/IntelligenceOverview.tsx` (line 231), `src/components/intelligence/NextGenInsights.tsx` (line 521)

### 4. **Proactive Impact Alerts** ✅
- **Location**: Intelligence Hero section (Overview tab)
- **What it shows**: 
  - Daily automated alerts
  - Critical impact summaries
  - Alert count and severity indicators
- **Status**: ✅ **CONNECTED** - Now fetches from Azure Storage Table via graph-query API
- **Code**: `src/components/intelligence/ProactiveImpactAlerts.tsx`

### 5. **Impact Forecasts in AI Insights** ✅
- **Location**: AI Insights Panel (all tabs)
- **What it shows**: 
  - Forecast cards for top 3 careers/sectors
  - Confidence intervals
  - Trend indicators
- **Status**: ✅ **WORKING** - Fetches forecasts via useImpactQueries hook
- **Code**: `src/components/intelligence/AIInsightsPanel.tsx` (lines 182-227)

## ⚠️ What Users CANNOT See (Missing Features)

### 1. **Detailed Impact Reports** ❌
- **Missing**: Full impact analysis reports with:
  - Evidence chains (document IDs, page numbers)
  - Policy-by-policy breakdown
  - Quantitative aggregations
  - Conflict identification
  - Temporal trends
- **Backend**: ✅ `generateImpactReport()` exists in `graph-query/index.js`
- **Frontend**: ❌ No component to display full reports
- **Action Needed**: Create `ImpactReportModal` or `ImpactReportView` component

### 2. **Clickable Impact Badges** ❌
- **Current**: Badges are display-only
- **Missing**: Click to view detailed impacts for that entity
- **Action Needed**: Add onClick handler to `ImpactBadge` component that opens impact details

### 3. **Impact Details Modal/View** ❌
- **Missing**: Modal or expanded view showing:
  - List of all impacts for an entity
  - Impact type, severity, direction
  - Policy sources
  - Quantitative values
  - Evidence text
- **Action Needed**: Create `ImpactDetailsModal` component

### 4. **Impact Aggregation View** ❌
- **Missing**: View showing aggregated impacts across multiple policies
- **Backend**: ✅ `aggregateImpactsForEntity()` exists
- **Frontend**: ❌ No UI to trigger or display aggregation
- **Action Needed**: Add aggregation view to impact details

### 5. **Impact Trend Analysis** ❌
- **Missing**: Visual charts showing impact trends over time
- **Backend**: ✅ `analyzeImpactTrends()` exists
- **Frontend**: ❌ No trend visualization
- **Action Needed**: Add trend charts to impact reports

### 6. **Impact Comparison View** ❌
- **Missing**: Compare impacts across multiple entities
- **Backend**: ✅ `compareImpacts()` exists
- **Frontend**: ❌ No comparison UI
- **Action Needed**: Create comparison view component

## 📊 Current Data Flow

```
User Views Dashboard
    ↓
CareersDashboard/FundingDashboard
    ↓
useImpactQueries.getImpactsForEntity()
    ↓
graph-query API (action: 'get_impacts')
    ↓
Returns: Impact[] array
    ↓
ImpactBadge component displays count/severity
```

**Problem**: Users see badges but cannot drill down into details.

## 🎯 Recommended Next Steps

### Priority 1: Make Impact Badges Clickable
1. Add onClick handler to `ImpactBadge`
2. Create `ImpactDetailsModal` component
3. Display full impact list with evidence chains

### Priority 2: Add Impact Report View
1. Create `ImpactReportView` component
2. Call `generateImpactReport()` API
3. Display comprehensive report with all sections

### Priority 3: Add Impact Aggregation UI
1. Add "View Aggregated Impacts" button
2. Call `aggregateImpactsForEntity()` API
3. Display aggregated results with conflicts highlighted

### Priority 4: Add Trend Visualization
1. Integrate `analyzeImpactTrends()` results
2. Add chart component for temporal trends
3. Show in impact report view

## 🔍 How to Verify What's Working

1. **Impact Badges**: 
   - Go to `/intelligence` → Careers tab
   - Look for impact badges on career cards
   - ✅ Should show count and severity

2. **Scenario Modeling**:
   - Go to `/intelligence` → Overview tab
   - Scroll to "Impact Scenario Modeling" panel
   - Enter entity name and run scenario
   - ✅ Should show simulation results

3. **Proactive Alerts**:
   - Go to `/intelligence` → Overview tab
   - Look at top hero section
   - ✅ Should show alert summary (if alerts exist)

4. **Impact Forecasts**:
   - Go to `/intelligence` → Any tab
   - Look at AI Insights Panel
   - ✅ Should show forecast cards for top entities

## 📝 Summary

**What Works**: 
- ✅ Impact badges display on careers/funding
- ✅ Scenario modeling panel is visible
- ✅ Proactive alerts are connected
- ✅ Impact forecasts are fetched and displayed

**What's Missing**:
- ❌ Clickable impact badges → detailed view
- ❌ Full impact reports with evidence chains
- ❌ Impact aggregation UI
- ❌ Trend visualization
- ❌ Impact comparison view

**Bottom Line**: Users can see impact indicators and run scenarios, but cannot drill down into detailed impact analysis reports. The backend has all the functionality - we just need UI components to display it.
