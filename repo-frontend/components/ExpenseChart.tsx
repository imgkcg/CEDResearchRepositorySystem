import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type Expense = {
  category: string;
  amount: number;
};

interface Props {
  expenses: Expense[];
  categoryColors: { [cat: string]: string }; // <-- add this!
  onRefresh?: () => void;
}

export default function ExpenseChart({ expenses, categoryColors, onRefresh }: Props) {
  if (!expenses || expenses.length === 0) {
    return (
      <View style={{ marginVertical: 20, alignItems: 'center' }}>
        <Text style={{ color: '#999' }}>
          {expenses?.length === 0 ? 'No expenses yet' : 'Loading...'}
        </Text>
      </View>
    );
  }

  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as { [key: string]: number });

  // Use categoryColors mapping for each slice
  const chartData = Object.entries(categoryTotals).map(([category, total], index) => ({
    name: category,
    amount: total,
    color: categoryColors?.[category] || '#CCCCCC', // fallback to gray
    legendFontColor: '#374151',
    legendFontSize: 14,
  }));

  return (
    <View style={{ marginVertical: 10 }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B' }}>
          Expense Distribution
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>
          Total: ₱{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
        </Text>
      </View>

      <PieChart
        data={chartData}
        width={screenWidth - 50}
        height={180}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: () => '#1E293B',
        }}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="1"
      />
    </View>
  );
}
