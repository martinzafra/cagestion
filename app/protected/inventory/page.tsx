'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Lock, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

type InventoryType = 'agents' | 'apartments' | 'platforms' | 'expense_types' | 'invoice_items' | 'payment_types';

interface TabItem {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<InventoryType>('apartments');
  const [items, setItems] = useState<TabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [allAgents, setAllAgents] = useState<TabItem[]>([]);
  const [agentApartments, setAgentApartments] = useState<Set<string>>(new Set());

  const tables: { [key in InventoryType]: string } = {
    agents: 'inventory_agents',
    apartments: 'inventory_apartments',
    platforms: 'inventory_platforms',
    expense_types: 'inventory_expense_types',
    invoice_items: 'inventory_invoice_items',
    payment_types: 'inventory_payment_types',
  };

  const tabLabels: { [key in InventoryType]: string } = {
    agents: 'Agents',
    apartments: 'Apartments',
    platforms: 'Platforms',
    expense_types: 'Expense Types',
    invoice_items: 'Invoice Items',
    payment_types: 'Payment Types',
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'admin') {
        toast.error('Access denied');
        window.location.href = '/protected/bookings';
        return;
      }

      setUserRole('admin');
      setLoading(false);
    } catch (error) {
      toast.error('Authorization failed');
    }
  };

  const fetchItems = async () => {
    try {
      const tableName = tables[activeTab];
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);

      if (activeTab === 'apartments') {
        fetchAgentApartments();
      }
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  const fetchAgentApartments = async () => {
    try {
      const [agentsRes, linksRes] = await Promise.all([
        supabase.from('inventory_agents').select('*').order('name'),
        supabase.from('inventory_agent_apartments').select('agent_id, apartment_id'),
      ]);

      if (agentsRes.data) setAllAgents(agentsRes.data);
      if (linksRes.data) {
        setAgentApartments(
          new Set(linksRes.data.map((l: any) => `${l.agent_id}:${l.apartment_id}`))
        );
      }
    } catch (error) {
      toast.error('Failed to fetch agent permissions');
    }
  };

  const toggleAgentApartment = async (agentId: string, apartmentId: string) => {
    const key = `${agentId}:${apartmentId}`;
    const isEnabled = agentApartments.has(key);

    try {
      if (isEnabled) {
        const { error } = await supabase
          .from('inventory_agent_apartments')
          .delete()
          .eq('agent_id', agentId)
          .eq('apartment_id', apartmentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_agent_apartments')
          .insert([{ agent_id: agentId, apartment_id: apartmentId }]);
        if (error) throw error;
      }

      setAgentApartments((prev) => {
        const next = new Set(prev);
        if (isEnabled) next.delete(key);
        else next.add(key);
        return next;
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    try {
      const tableName = tables[activeTab];
      const { error } = await supabase
        .from(tableName)
        .insert([{ name: newItemName }]);

      if (error) throw error;
      toast.success('Item added');
      setNewItemName('');
      setShowAddForm(false);
      fetchItems();
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        toast.error('This item already exists');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleStartEdit = (item: TabItem) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingValue.trim()) {
      toast.error('Item name is required');
      return;
    }

    try {
      const tableName = tables[activeTab];
      const { error } = await supabase
        .from(tableName)
        .update({ name: editingValue.trim() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Item updated');
      setEditingId(null);
      fetchItems();
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        toast.error('This item already exists');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const tableName = tables[activeTab];
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item deleted');
      fetchItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!userRole || userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock size={48} className="text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600 mt-2">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600 mt-1">Manage system catalogs and master data</p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(tabLabels) as InventoryType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setShowAddForm(false);
              }}
              className={`px-4 py-2 font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Add new ${tabLabels[activeTab].toLowerCase()}...`}
              className="input flex-1"
              autoFocus
            />
            <button type="submit" className="btn-primary">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewItemName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add {tabLabels[activeTab]}
        </button>
      )}

      {/* Items List */}
      <div className="card">
        {items.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No items yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg hover:bg-gray-50"
              >
              <div className="flex justify-between items-center">
                {editingId === item.id ? (
                  <>
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="input flex-1 mr-2"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="p-1 hover:bg-green-100 rounded"
                        title="Save"
                      >
                        <Check size={18} className="text-green-600" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Cancel"
                      >
                        <X size={18} className="text-gray-600" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{item.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1 hover:bg-blue-100 rounded"
                        title="Edit"
                      >
                        <Pencil size={18} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              {activeTab === 'apartments' && allAgents.length > 0 && (
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-3">
                  <span className="text-xs text-gray-500 w-full">Enabled agents:</span>
                  {allAgents.map((agent) => {
                    const enabled = agentApartments.has(`${agent.id}:${item.id}`);
                    return (
                      <label
                        key={agent.id}
                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleAgentApartment(agent.id, item.id)}
                        />
                        {agent.name}
                      </label>
                    );
                  })}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
