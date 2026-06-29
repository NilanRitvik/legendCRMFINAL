'use client';

import { useState, useEffect } from 'react';

export default function PurchasePage() {
  const [materials, setMaterials] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tools, setTools] = useState([]);
  const [machines, setMachines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [approvedDesigns, setApprovedDesigns] = useState([]);
  const [racksList, setRacksList] = useState([]);
  const [wasteBinsList, setWasteBinsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Full-screen panel viewers
  const [openPanel, setOpenPanel] = useState(null); // 'live_stock' | 'ledger' | 'tools' | 'machines'

  // Panel search/filter states
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilterStatus, setStockFilterStatus] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [toolsSearch, setToolsSearch] = useState('');
  const [toolsStatusFilter, setToolsStatusFilter] = useState('all');
  const [machinesSearch, setMachinesSearch] = useState('');
  const [machinesStatusFilter, setMachinesStatusFilter] = useState('all');

  // List pagination / toggle view states (Recent 10 entries)
  const [showAllStock, setShowAllStock] = useState(false);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [showAllMachines, setShowAllMachines] = useState(false);

  // Modal / Form triggers
  const [activeForm, setActiveForm] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [purchaseForm, setPurchaseForm] = useState({
    invoice_number: '',
    supplier: '',
    date: '',
    notes: '',
    transport_charges: '',
    items: [
      { material_name: '', material_brand: '', quantity: '', unit: 'pcs', rate: '', damaged_quantity: '', gst_percentage: '', rack_code: '' }
    ]
  });

  const [replacementForm, setReplacementForm] = useState({
    transaction_id: '', received_quantity: '', notes: ''
  });

  const [oldStockForm, setOldStockForm] = useState({
    material_name: '', material_brand: '', unit: 'pcs',
    quantity: '', rate: '', purchase_date: '', notes: '', rack_code: ''
  });

  const [issueForm, setIssueForm] = useState({
    material_name: '', quantity: '', project: '', notes: ''
  });

  const [returnForm, setReturnForm] = useState({
    material_name: '', quantity: '', project: '', notes: ''
  });

  // Multi-item stock states
  const [issueItems, setIssueItems] = useState([{ material_name: '', quantity: '' }]);
  const [issueProject, setIssueProject] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  const [returnItems, setReturnItems] = useState([{ material_name: '', quantity: '', rack_code: '' }]);
  const [returnProject, setReturnProject] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnActiveTab, setReturnActiveTab] = useState('log'); // 'log' | 'approve'
  
  const [modalMaterialSearch, setModalMaterialSearch] = useState('');
  const [selectedPendingReturn, setSelectedPendingReturn] = useState(null);

  const [wasteForm, setWasteForm] = useState({
    material_name: '', quantity: '', project: '', notes: ''
  });
  const [wasteItems, setWasteItems] = useState([{ material_name: '', quantity: '', waste_bin_code: '' }]);
  const [wasteProject, setWasteProject] = useState('');
  const [wasteNotes, setWasteNotes] = useState('');

  const [toolForm, setToolForm] = useState({
    name: '', make_brand: '', asset_id: '', status: 'available',
    handler_name: '', handler_contact: '', handler_supervisor: '',
    issue_date: '', tool_worth: '', acknowledgement_copy: '', photo_url: '', notes: ''
  });

  const [machineForm, setMachineForm] = useState({
    name: '', make_brand: '', purchase_year: '', status: 'available',
    last_service_date: '', next_service_due: '', service_contact: '', notes: ''
  });

  const [serviceForm, setServiceForm] = useState({
    expenses: '', description: '', next_service_due: '', status: 'available'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, resDesigns, resRacks, resWaste] = await Promise.all([
        fetch('/api/purchase'),
        fetch('/api/designing'),
        fetch('/api/warehouse-racks'),
        fetch('/api/wasteroom-bins')
      ]);
      if (!res.ok) throw new Error('Failed to load inventory data');
      const data = await res.json();
      const dataDesigns = await resDesigns.json();
      const dataRacks = await resRacks.json();
      const dataWaste = await resWaste.json();
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setTools(Array.isArray(data.tools) ? data.tools : []);
      setMachines(Array.isArray(data.machines) ? data.machines : []);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      setApprovedDesigns(Array.isArray(dataDesigns) ? dataDesigns : []);
      setRacksList(Array.isArray(dataRacks.racks) ? dataRacks.racks : []);
      setWasteBinsList(Array.isArray(dataWaste.bins) ? dataWaste.bins : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getApprovedDesignsForClient = (clientId) => {
    if (!clientId) return [];
    return approvedDesigns.filter(d => 
      d.approval_status === 'approved' &&
      (d.client?._id === clientId || d.client === clientId)
    );
  };

  const getDynamicQtyLabel = (unit) => {
    switch (unit) {
      case 'pcs': return 'pieces';
      case 'mtr': return 'meters';
      case 'kg': return 'kilograms';
      case 'ltr': return 'litres';
      case 'cm': return 'centimeters';
      case 'inch': return 'inches';
      case 'mm': return 'millimeters';
      case 'rft': return 'running feet';
      case 'sqt': return 'square feet';
      case 'box': return 'boxes';
      default: return 'qty';
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setToolForm(prev => ({ ...prev, [field]: data.url }));
        alert('File uploaded successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload file');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAddTool = () => {
    setToolForm({
      name: '', make_brand: '', asset_id: '', status: 'available',
      handler_name: '', handler_contact: '', handler_supervisor: '',
      issue_date: '', tool_worth: '', acknowledgement_copy: '', photo_url: '', notes: ''
    });
    setActiveForm('add_tool');
  };

  const handleAction = async (actionType, payload) => {
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, ...payload })
      });
      if (res.ok) {
        setActiveForm(null);
        setSelectedItem(null);
        setPurchaseForm({
          invoice_number: '',
          supplier: '',
          date: '',
          notes: '',
          transport_charges: '',
          items: [
            { material_name: '', material_brand: '', quantity: '', unit: 'pcs', rate: '', damaged_quantity: '', gst_percentage: '', rack_code: '' }
          ]
        });
        setReplacementForm({ transaction_id: '', received_quantity: '', notes: '' });
        setOldStockForm({ material_name: '', material_brand: '', unit: 'pcs', quantity: '', rate: '', purchase_date: '', notes: '', rack_code: '' });
        setIssueForm({ material_name: '', quantity: '', project: '', notes: '' });
        setReturnForm({ material_name: '', quantity: '', project: '', notes: '' });
        setWasteForm({ material_name: '', quantity: '', project: '', notes: '' });
        setToolForm({
          name: '', make_brand: '', asset_id: '', status: 'available',
          handler_name: '', handler_contact: '', handler_supervisor: '',
          issue_date: '', tool_worth: '', acknowledgement_copy: '', photo_url: '', notes: ''
        });
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete action');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  };

  const handleDelete = async (actionType, id, label) => {
    if (!confirm(`Are you sure you want to permanently delete this ${label}?`)) return;
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, id })
      });
      if (res.ok) { loadData(); }
      else { const err = await res.json(); alert(err.error || `Failed to delete ${label}`); }
    } catch { alert('Error connecting to server.'); }
  };

  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...purchaseForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
  };

  const addPurchaseItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { material_name: '', material_brand: '', quantity: '', unit: 'pcs', rate: '', damaged_quantity: '', gst_percentage: '', rack_code: '' }]
    });
  };

  const removePurchaseItem = (index) => {
    if (purchaseForm.items.length === 1) return;
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index)
    });
  };

  const handleBatchIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueProject) return alert('Please select a project');
    const validItems = issueItems.filter(item => item.material_name && Number(item.quantity) > 0);
    if (validItems.length === 0) return alert('Please add at least one material with a valid quantity');

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_issue',
          items: validItems,
          project: issueProject,
          notes: issueNotes
        })
      });
      if (res.ok) {
        setActiveForm(null);
        setIssueItems([{ material_name: '', quantity: '' }]);
        setIssueProject('');
        setIssueNotes('');
        alert('Batch stock issue request sent successfully! Pending CEO approval.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete batch issue');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  };

  const handleBatchWasteSubmit = async (e) => {
    e.preventDefault();
    const validItems = wasteItems.filter(item => item.material_name && Number(item.quantity) > 0);
    if (validItems.length === 0) return alert('Please select at least one material with a valid quantity to write off');

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_waste',
          items: validItems,
          project: wasteProject || 'general',
          notes: wasteNotes
        })
      });
      if (res.ok) {
        setActiveForm(null);
        setWasteItems([{ material_name: '', quantity: '', waste_bin_code: '' }]);
        setWasteProject('');
        setWasteNotes('');
        alert('Batch waste write-off request sent successfully! Pending CEO approval.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete batch waste write-off');
      }
    } catch {
      alert('Error connecting to server.');
    }
  };

  const handleBatchReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnProject) return alert('Please select a project');
    const validItems = returnItems.filter(item => item.material_name && Number(item.quantity) > 0);
    if (validItems.length === 0) return alert('Please add at least one material with a valid quantity');

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_return',
          items: validItems,
          project: returnProject,
          notes: returnNotes
        })
      });
      if (res.ok) {
        setActiveForm(null);
        setReturnItems([{ material_name: '', quantity: '', rack_code: '' }]);
        setReturnProject('');
        setReturnNotes('');
        alert('Batch stock return request sent successfully! Pending CEO approval.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to request batch return');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  };

  const handleVerifyReturn = async (id, verified) => {
    let notes = '';
    if (!verified) {
      notes = window.prompt('Please enter description of why the return was denied (e.g., items damaged):');
      if (notes === null) return; // user cancelled prompt
      if (!notes.trim()) return alert('Description is required to deny verification.');
    } else {
      notes = 'Verified and accepted by Stock Team.';
    }

    try {
      const res = await fetch('/api/stock-verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verified, notes })
      });
      if (res.ok) {
        alert(verified ? 'Surplus items added back to stock inventory!' : 'Return verification denied and logged.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to verify return');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  };

  const handleVerifyBatchReturn = async (batch, verified) => {
    let notes = '';
    if (!verified) {
      notes = window.prompt('Please enter reason for denying verification (e.g., items damaged):');
      if (notes === null) return;
      if (!notes.trim()) return alert('Reason is required to deny verification.');
    } else {
      notes = 'Verified and accepted to stock by Stock Team.';
    }

    try {
      setLoading(true);
      const promises = batch.items.map(item => 
        fetch('/api/stock-verify', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item._id, verified, notes })
        })
      );
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      if (allOk) {
        alert(verified ? 'All items in this return have been added back to live stock!' : 'Return batch verification denied.');
        setSelectedPendingReturn(null);
        setActiveForm(null);
        loadData();
      } else {
        alert('Some items failed to verify. Please check the log.');
        loadData();
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditTool = (tool) => {
    setToolForm({
      id: tool._id, name: tool.name, make_brand: tool.make_brand || '',
      asset_id: tool.asset_id || '', status: tool.status || 'available',
      handler_name: tool.handler_name || '', handler_contact: tool.handler_contact || '',
      handler_supervisor: tool.handler_supervisor || '',
      issue_date: tool.issue_date ? new Date(tool.issue_date).toISOString().split('T')[0] : '',
      tool_worth: tool.tool_worth || '',
      acknowledgement_copy: tool.acknowledgement_copy || '',
      photo_url: tool.photo_url || '', notes: tool.notes || ''
    });
    setSelectedItem(tool);
    setActiveForm('edit_tool');
  };

  const handleOpenEditMachine = (m) => {
    setMachineForm({
      id: m._id, name: m.name, make_brand: m.make_brand || '',
      purchase_year: m.purchase_year || '', status: m.status || 'available',
      last_service_date: m.last_service_date ? new Date(m.last_service_date).toISOString().split('T')[0] : '',
      next_service_due: m.next_service_due ? new Date(m.next_service_due).toISOString().split('T')[0] : '',
      service_contact: m.service_contact || '', notes: m.notes || ''
    });
    setSelectedItem(m);
    setActiveForm('edit_machine');
  };

  const handleExportCSV = (type) => {
    let csv = 'data:text/csv;charset=utf-8,';
    if (type === 'stock') {
      csv += 'LEGEND INTERIORS - LIVE STOCK INVENTORY\n\nMaterial Name,Unit,Current Stock,Stock Value\n';
      materials.forEach(m => {
        const val = (m.current_stock || 0) * (m.last_rate || 0);
        csv += `"${m.name}","${m.unit}",${m.current_stock},₹${val}\n`;
      });
    } else if (type === 'ledger') {
      csv += 'LEGEND INTERIORS - STOCK MOVEMENT LEDGER\n\nDate,Type,Material,Brand,Qty,Rate,Supplier,Invoice,Notes\n';
      transactions.forEach(t => {
        csv += `"${new Date(t.date || t.createdAt).toLocaleDateString('en-IN')}","${t.transaction_type}","${t.material_name}","${t.material_brand || ''}",${t.quantity},${t.rate || 0},"${t.supplier || ''}","${t.invoice_number || ''}","${t.notes || ''}"\n`;
      });
    } else if (type === 'tools') {
      csv += 'LEGEND INTERIORS - TOOLS ASSETS INVENTORY\n\nTool Name,Make/Brand,Asset ID,Worth,Status,Handler,Contact\n';
      tools.forEach(t => {
        csv += `"${t.name}","${t.make_brand || ''}","${t.asset_id || ''}",₹${t.tool_worth || 0},"${t.status}","${t.handler_name || ''}","${t.handler_contact || ''}"\n`;
      });
    } else if (type === 'machines') {
      csv += 'LEGEND INTERIORS - WORKSHOP MACHINES\n\nMachine Name,Make/Brand,Purchase Year,Status,Last Service,Next Service Due\n';
      machines.forEach(m => {
        csv += `"${m.name}","${m.make_brand || ''}","${m.purchase_year || ''}","${m.status}","${m.last_service_date ? new Date(m.last_service_date).toLocaleDateString('en-IN') : ''}","${m.next_service_due ? new Date(m.next_service_due).toLocaleDateString('en-IN') : ''}"\n`;
      });
    }
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `legend_interiors_${type}_report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Derived stats
  const totalStockValue = transactions
    .filter(t => t.transaction_type === 'purchase' || t.transaction_type === 'old_stock')
    .reduce((sum, t) => sum + (Number(t.rate || 0) * Number(t.quantity || 0)), 0);

  const totalIssuedValue = transactions
    .filter(t => t.transaction_type === 'issue')
    .reduce((sum, t) => sum + (Number(t.rate || 0) * Number(t.quantity || 0)), 0);

  const lowStockItems = materials.filter(m => m.current_stock <= 5 && m.current_stock > 0).length;
  const outOfStockItems = materials.filter(m => m.current_stock <= 0).length;
  const totalToolsWorth = tools.reduce((s, t) => s + Number(t.tool_worth || 0), 0);
  const availableTools = tools.filter(t => t.status === 'available').length;
  const totalMachineServiceCost = machines.reduce((s, m) => s + Number(m.service_expenses_total || 0), 0);

  // Filtered lists
  const pendingStockVerifications = transactions.filter(t => 
    t.transaction_type === 'return' && 
    t.approval_status === 'approved' && 
    t.stock_verified === null
  );

  const pendingReplacements = transactions.filter(t =>
    t.transaction_type === 'purchase' &&
    t.approval_status === 'approved' &&
    (t.damaged_quantity || 0) > 0 &&
    t.replacement_status === 'pending'
  );

  const filteredStocks = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(stockSearch.toLowerCase());
    if (stockFilterStatus === 'in_stock') return matchSearch && m.current_stock > 5;
    if (stockFilterStatus === 'low') return matchSearch && m.current_stock > 0 && m.current_stock <= 5;
    if (stockFilterStatus === 'out') return matchSearch && m.current_stock <= 0;
    return matchSearch;
  });

  const filteredLedger = transactions.filter(t => {
    const matchSearch =
      t.material_name?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.supplier?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.invoice_number?.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchType = ledgerTypeFilter === 'all' || t.transaction_type === ledgerTypeFilter;
    return matchSearch && matchType;
  });

  const filteredTools = tools.filter(t => {
    const matchSearch =
      t.name?.toLowerCase().includes(toolsSearch.toLowerCase()) ||
      t.make_brand?.toLowerCase().includes(toolsSearch.toLowerCase()) ||
      t.asset_id?.toLowerCase().includes(toolsSearch.toLowerCase()) ||
      t.handler_name?.toLowerCase().includes(toolsSearch.toLowerCase());
    const matchStatus = toolsStatusFilter === 'all' || t.status === toolsStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredMachines = machines.filter(m => {
    const matchSearch =
      m.name?.toLowerCase().includes(machinesSearch.toLowerCase()) ||
      m.make_brand?.toLowerCase().includes(machinesSearch.toLowerCase());
    const matchStatus = machinesStatusFilter === 'all' || m.status === machinesStatusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      available: { bg: '#ecfdf5', color: '#059669', text: '🟢 Available' },
      issued: { bg: '#fff7ed', color: '#c2410c', text: '🟠 Issued' },
      damaged: { bg: '#fef2f2', color: '#dc2626', text: '🔴 Damaged' },
      in_service: { bg: '#fff7ed', color: '#ca8a04', text: '🟡 In Service' },
      out_of_order: { bg: '#fef2f2', color: '#dc2626', text: '⛔ Out of Order' },
    };
    const s = styles[status] || { bg: '#f1f5f9', color: '#64748b', text: status };
    return (
      <span style={{ fontSize: '10px', fontWeight: '800', background: s.bg, color: s.color, padding: '3px 9px', borderRadius: '5px', whiteSpace: 'nowrap' }}>
        {s.text}
      </span>
    );
  };

  const txnBadge = (type) => {
    const map = {
      purchase: { bg: '#ecfdf5', color: '#059669', label: '📥 PURCHASE' },
      old_stock: { bg: '#eff6ff', color: '#2563eb', label: '📦 OLD STOCK' },
      issue: { bg: '#fff7ed', color: '#c2410c', label: '📤 ISSUED' },
      return: { bg: '#f5f3ff', color: '#7c3aed', label: '↩️ RETURN' },
      waste: { bg: '#fef2f2', color: '#dc2626', label: '🗑️ WASTE' },
    };
    const m = map[type] || { bg: '#f1f5f9', color: '#64748b', label: type?.toUpperCase() };
    return <span style={{ fontSize: '10px', fontWeight: '800', background: m.bg, color: m.color, padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{m.label}</span>;
  };

  const addIssueItemRow = () => {
    setIssueItems([...issueItems, { material_name: '', quantity: '' }]);
  };
  const removeIssueItemRow = (index) => {
    if (issueItems.length > 1) {
      setIssueItems(issueItems.filter((_, i) => i !== index));
    }
  };
  const updateIssueItem = (index, key, val) => {
    setIssueItems(issueItems.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  const addReturnItemRow = () => {
    setReturnItems([...returnItems, { material_name: '', quantity: '' }]);
  };
  const removeReturnItemRow = (index) => {
    if (returnItems.length > 1) {
      setReturnItems(returnItems.filter((_, i) => i !== index));
    }
  };
  const updateReturnItem = (index, key, val) => {
    setReturnItems(returnItems.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };


  const handleToggleIssueMaterial = (materialName) => {
    // If the items list has only one empty item, replace it instead of appending
    let currentItems = [...issueItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      const filtered = currentItems.filter(i => i.material_name !== materialName);
      setIssueItems(filtered.length === 0 ? [{ material_name: '', quantity: '' }] : filtered);
    } else {
      setIssueItems([...currentItems, { material_name: materialName, quantity: '1' }]);
    }
  };

  const handleUpdateIssueQuantity = (materialName, qty) => {
    let currentItems = [...issueItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      setIssueItems(currentItems.map(i => i.material_name === materialName ? { ...i, quantity: qty } : i));
    } else {
      setIssueItems([...currentItems, { material_name: materialName, quantity: qty }]);
    }
  };

  const handleToggleReturnMaterial = (materialName) => {
    let currentItems = [...returnItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      const filtered = currentItems.filter(i => i.material_name !== materialName);
      setReturnItems(filtered.length === 0 ? [{ material_name: '', quantity: '', rack_code: '' }] : filtered);
    } else {
      setReturnItems([...currentItems, { material_name: materialName, quantity: '1', rack_code: '' }]);
    }
  };

  const handleUpdateReturnQuantity = (materialName, qty) => {
    let currentItems = [...returnItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      setReturnItems(currentItems.map(i => i.material_name === materialName ? { ...i, quantity: qty } : i));
    } else {
      setReturnItems([...currentItems, { material_name: materialName, quantity: qty, rack_code: '' }]);
    }
  };

  const handleUpdateReturnRack = (materialName, rackCode) => {
    let currentItems = [...returnItems];
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      setReturnItems(currentItems.map(i => i.material_name === materialName ? { ...i, rack_code: rackCode } : i));
    }
  };

  const handleToggleWasteMaterial = (materialName) => {
    let currentItems = [...wasteItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      const filtered = currentItems.filter(i => i.material_name !== materialName);
      setWasteItems(filtered.length === 0 ? [{ material_name: '', quantity: '', waste_bin_code: '' }] : filtered);
    } else {
      setWasteItems([...currentItems, { material_name: materialName, quantity: '1', waste_bin_code: '' }]);
    }
  };

  const handleUpdateWasteQuantity = (materialName, qty) => {
    let currentItems = [...wasteItems];
    if (currentItems.length === 1 && currentItems[0].material_name === '') {
      currentItems = [];
    }
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      setWasteItems(currentItems.map(i => i.material_name === materialName ? { ...i, quantity: qty } : i));
    } else {
      setWasteItems([...currentItems, { material_name: materialName, quantity: qty, waste_bin_code: '' }]);
    }
  };

  const handleUpdateWasteBin = (materialName, binCode) => {
    let currentItems = [...wasteItems];
    const exists = currentItems.some(i => i.material_name === materialName);
    if (exists) {
      setWasteItems(currentItems.map(i => i.material_name === materialName ? { ...i, waste_bin_code: binCode } : i));
    }
  };

  const sectionCard = ({ icon, title, count, subtitle, colorClass, panelKey, onAdd }) => (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</div>
        <span style={{
          fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
          background: 'var(--primary-light)', color: 'var(--primary)',
          padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase'
        }}>{subtitle}</span>
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' }}>{count}</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: '12px', padding: '8px' }}
          onClick={() => setOpenPanel(panelKey)}
        >
          View {title} →
        </button>
        {onAdd && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '8px 12px' }}
            onClick={onAdd}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* === PAGE HEADER === */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
            🛒 Purchase & Workshop Inventory
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Material stocks, stock ledger, tools, and machines — all in one place
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => window.print()}>🖨️ Print PDF</button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '12px', background: '#dcfce7', color: '#15803d', border: 'none' }}
            onClick={() => setActiveForm('old_stock')}
          >
            📦 Add Old Stock
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: '12px', fontWeight: '800' }}
            onClick={() => setActiveForm('purchase')}
          >
            📥 Log Purchase
          </button>
        </div>
      </div>

      {/* === TOP KPI CARDS === */}
      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading Workshop Inventory...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="card-metric accent-primary">
              <div className="metric-title">📦 Total Stock Value</div>
              <div className="metric-value" style={{ fontSize: '22px' }}>₹{totalStockValue.toLocaleString('en-IN')}</div>
              <div className="metric-subtitle">Cumulative purchase value (INR)</div>
            </div>
            <div className="card-metric accent-success">
              <div className="metric-title">✅ Material Types</div>
              <div className="metric-value" style={{ fontSize: '22px' }}>{materials.length}</div>
              <div className="metric-subtitle">{lowStockItems} low · {outOfStockItems} out of stock</div>
            </div>
            <div className="card-metric accent-warning">
              <div className="metric-title">📤 Issued to Projects</div>
              <div className="metric-value" style={{ fontSize: '22px' }}>₹{totalIssuedValue.toLocaleString('en-IN')}</div>
              <div className="metric-subtitle">Total stock dispatched value</div>
            </div>
            <div className="card-metric" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div className="metric-title" style={{ color: '#7c3aed' }}>🔧 Tools Asset Worth</div>
              <div className="metric-value" style={{ fontSize: '22px' }}>₹{totalToolsWorth.toLocaleString('en-IN')}</div>
              <div className="metric-subtitle">{availableTools} / {tools.length} available</div>
            </div>
            <div className="card-metric accent-danger">
              <div className="metric-title">⚙️ Machine Service Cost</div>
              <div className="metric-value" style={{ fontSize: '22px' }}>₹{totalMachineServiceCost.toLocaleString('en-IN')}</div>
              <div className="metric-subtitle">Cumulative · {machines.length} machines</div>
            </div>
          </div>

          {/* QUICK ACTION STRIP */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '14px', padding: '18px 24px',
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
              ⚡ Quick Actions
            </div>
            <button className="btn btn-primary" style={{ fontSize: '12px', fontWeight: '800' }} onClick={() => setActiveForm('purchase')}>
              📥 Log Purchase
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', border: 'none', fontWeight: '700' }} onClick={() => setActiveForm('old_stock')}>
              📦 Add Old Stock
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '12px', background: '#fff7ed', color: '#c2410c', border: 'none', fontWeight: '700' }} onClick={() => { setIssueItems([{ material_name: '', quantity: '' }]); setIssueProject(''); setIssueNotes(''); setActiveForm('issue'); }}>
              📤 Issue to Project
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '12px', background: '#f5f3ff', color: '#7c3aed', border: 'none', fontWeight: '700' }} onClick={() => { setReturnItems([{ material_name: '', quantity: '' }]); setReturnProject(''); setReturnNotes(''); setReturnActiveTab(pendingStockVerifications.length > 0 ? 'approve' : 'log'); setActiveForm('return'); }}>
              ↩️ Project Return
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '12px', background: '#fef2f2', color: '#dc2626', border: 'none', fontWeight: '700' }} onClick={() => setActiveForm('waste')}>
              🗑️ Write-off Waste
            </button>
          </div>

          {/* PENDING SURPLUS RETURNS VERIFICATION BANNER */}
          {pendingStockVerifications.length > 0 && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '12px',
              padding: '16px 20px',
              marginTop: '20px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#b45309', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ♻️ Surplus Returns Awaiting Stock Team Verification
                </strong>
                <span style={{ fontSize: '11px', background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                  {pendingStockVerifications.length} Awaiting
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingStockVerifications.map(t => (
                  <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '13px' }}>
                    <div>
                      <strong>{t.quantity} pcs of {t.material_name}</strong> from project <em>{t.project?.name || 'N/A'}</em> (Approved by CEO)
                      {t.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>📝 Notes: "{t.notes}"</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleVerifyReturn(t._id, true)}
                        style={{ fontSize: '11px', background: '#10b981', border: 'none', padding: '4px 10px', color: '#fff' }}
                      >
                        Accept to Stock
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleVerifyReturn(t._id, false)}
                        style={{ fontSize: '11px', padding: '4px 10px', color: '#fff' }}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PENDING VENDOR REPLACEMENTS BANNER */}
          {pendingReplacements.length > 0 && (
            <div style={{
              background: '#e0f2fe',
              border: '1px solid #7dd3fc',
              borderRadius: '12px',
              padding: '16px 20px',
              marginTop: '0px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#0369a1', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔄 Damaged Goods Awaiting Vendor Replacement
                </strong>
                <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                  {pendingReplacements.length} Pending
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingReplacements.map(t => {
                  const remaining = t.damaged_quantity - (t.replacement_received_quantity || 0);
                  return (
                    <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                      <div>
                        <strong>{t.material_name}</strong> &mdash; <strong>{remaining} pcs remaining</strong> to replace (out of {t.damaged_quantity} damaged)
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          🏢 Vendor: <strong>{t.supplier || 'N/A'}</strong> &middot; 🧾 Invoice: <strong>{t.invoice_number}</strong>
                        </div>
                      </div>
                      <div>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setReplacementForm({
                              transaction_id: t._id,
                              received_quantity: remaining,
                              notes: ''
                            });
                            setSelectedItem(t);
                            setActiveForm('receive_replacement');
                          }}
                          style={{ fontSize: '11px', background: '#0284c7', border: 'none', padding: '5px 12px', color: '#fff', fontWeight: '700' }}
                        >
                          📥 Receive Replacement
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === 4 SECTION NAVIGATION CARDS === */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
              MODULES — CLICK TO VIEW DETAILS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>

              {/* LIVE STOCK INVENTORY */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                border: '1px solid #bbf7d0', borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.08 }}>📦</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    📦 Live Stock Inventory
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#064e3b' }}>{materials.length} <span style={{ fontSize: '14px', fontWeight: '600' }}>items</span></div>
                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                    ₹{totalStockValue.toLocaleString('en-IN')} total value · {outOfStockItems} out of stock
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: '12px', padding: '8px', background: '#047857', fontWeight: '800' }} onClick={() => setOpenPanel('live_stock')}>
                    View Live Stock →
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '8px 12px', background: '#d1fae5', color: '#065f46', border: 'none', fontWeight: '700' }} onClick={() => setActiveForm('purchase')}>
                    + Stock
                  </button>
                </div>
              </div>

              {/* STOCK MOVEMENT LEDGER */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                border: '1px solid #bfdbfe', borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.08 }}>📊</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    📊 Stock Management Ledger
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e3a8a' }}>{transactions.length} <span style={{ fontSize: '14px', fontWeight: '600' }}>transactions</span></div>
                  <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                    Purchases, issues, returns, waste logs
                  </div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: '12px', padding: '8px', background: '#1d4ed8', fontWeight: '800' }} onClick={() => setOpenPanel('ledger')}>
                  View Ledger →
                </button>
              </div>

              {/* TOOLS ASSETS */}
              <div style={{
                background: 'linear-gradient(135deg, #fdf4ff 0%, #faf5ff 100%)',
                border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.08 }}>🔧</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    🔧 Tools & Asset Management
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#4c1d95' }}>{tools.length} <span style={{ fontSize: '14px', fontWeight: '600' }}>tools</span></div>
                  <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '4px' }}>
                    {availableTools} available · ₹{totalToolsWorth.toLocaleString('en-IN')} worth
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: '12px', padding: '8px', background: '#7c3aed', fontWeight: '800' }} onClick={() => setOpenPanel('tools')}>
                    View Tools →
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '8px 12px', background: '#ede9fe', color: '#5b21b6', border: 'none', fontWeight: '700' }} onClick={handleOpenAddTool}>
                    + Add
                  </button>
                </div>
              </div>

              {/* WORKSHOP MACHINES */}
              <div style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #fffbf5 100%)',
                border: '1px solid #fed7aa', borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.08 }}>⚙️</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    ⚙️ Workshop Machines
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#7c2d12' }}>{machines.length} <span style={{ fontSize: '14px', fontWeight: '600' }}>machines</span></div>
                  <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '4px' }}>
                    Service cost: ₹{totalMachineServiceCost.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: '12px', padding: '8px', background: '#c2410c', fontWeight: '800' }} onClick={() => setOpenPanel('machines')}>
                    View Machines →
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '8px 12px', background: '#ffedd5', color: '#9a3412', border: 'none', fontWeight: '700' }} onClick={() => setActiveForm('add_machine')}>
                    + Add
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ================================================================
          FULL-SCREEN PANEL MODALS
      ================================================================ */}

      {/* === LIVE STOCK INVENTORY PANEL === */}
      {openPanel === 'live_stock' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '900px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>📦 Live Stock Inventory</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Real-time stock levels for all material types</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => handleExportCSV('stock')}>📥 Export Excel</button>
                <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setActiveForm('purchase')}>📥 Log Purchase</button>
                <button onClick={() => setOpenPanel(null)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)' }}>✕ Close</button>
              </div>
            </div>

            {/* Search + Filter */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text" className="form-control" placeholder="🔍 Search materials..."
                style={{ flex: 1, minWidth: '200px' }} value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
              />
              <select className="form-control" style={{ width: '160px' }} value={stockFilterStatus} onChange={e => setStockFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low">Low Stock (≤5)</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Stock Table */}
            <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="table-list" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Material Name</th>
                    <th>Unit</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Est. Value</th>
                    <th>Status</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllStock ? filteredStocks : filteredStocks.slice(0, 10)).map((m, i) => {
                    const stockVal = (m.current_stock || 0) * (m.last_rate || 0);
                    const statusBg = m.current_stock <= 0 ? '#fef2f2' : m.current_stock <= 5 ? '#fff7ed' : '#ecfdf5';
                    const statusColor = m.current_stock <= 0 ? '#dc2626' : m.current_stock <= 5 ? '#c2410c' : '#059669';
                    const statusLabel = m.current_stock <= 0 ? '⛔ Out of Stock' : m.current_stock <= 5 ? '⚠️ Low Stock' : '✅ In Stock';
                    return (
                      <tr key={m._id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{i + 1}</td>
                        <td><strong>{m.name}</strong></td>
                        <td style={{ color: 'var(--text-muted)' }}>{m.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '15px', color: statusColor }}>{m.current_stock}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                          {stockVal > 0 ? `₹${stockVal.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: statusBg, color: statusColor, padding: '3px 8px', borderRadius: '5px' }}>{statusLabel}</span>
                        </td>
                        <td className="no-print">
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-sm btn-primary" style={{ fontSize: '10px', padding: '3px 8px' }}
                              onClick={() => {
                                setPurchaseForm({
                                  invoice_number: '',
                                  supplier: '',
                                  date: '',
                                  notes: `Refill ${m.name}`,
                                  transport_charges: '',
                                  items: [
                                    { material_name: m.name, material_brand: '', quantity: '', unit: m.unit || 'pcs', rate: '', damaged_quantity: '', gst_percentage: '' }
                                  ]
                                });
                                setActiveForm('purchase');
                              }}>
                              + Restock
                            </button>
                            <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '3px 8px', background: '#fff7ed', color: '#c2410c', border: 'none' }}
                              onClick={() => { setIssueItems([{ material_name: m.name, quantity: '' }]); setIssueProject(''); setIssueNotes(''); setActiveForm('issue'); }}>
                              Issue
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStocks.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No materials found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredStocks.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAllStock(!showAllStock)}
                  style={{ fontSize: '12px', padding: '6px 16px', fontWeight: '700' }}
                >
                  {showAllStock ? '⬆️ Hide/View Recent 10 Only' : `⬇️ View All ${filteredStocks.length} Materials`}
                </button>
              </div>
            )}
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filteredStocks.length} of {materials.length} materials
            </div>
          </div>
        </div>
      )}

      {/* === STOCK LEDGER PANEL === */}
      {openPanel === 'ledger' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '1100px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>📊 Stock Management Ledger</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>All stock movements — purchases, issues, returns, and waste write-offs</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => handleExportCSV('ledger')}>📥 Export Excel</button>
                <button onClick={() => setOpenPanel(null)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)' }}>✕ Close</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input type="text" className="form-control" placeholder="🔍 Search by material, supplier, invoice..." style={{ flex: 1, minWidth: '200px' }} value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
              <select className="form-control" style={{ width: '160px' }} value={ledgerTypeFilter} onChange={e => setLedgerTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="purchase">Purchase</option>
                <option value="old_stock">Old Stock</option>
                <option value="issue">Issue</option>
                <option value="return">Return</option>
                <option value="waste">Waste</option>
              </select>
            </div>

            <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="table-list" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Material</th>
                    <th>Brand</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th>Approval</th>
                    <th>Project Ref</th>
                    <th>Supplier / Invoice</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllLedger ? filteredLedger : filteredLedger.slice(0, 10)).map(t => {
                    const isOut = t.transaction_type === 'issue' || t.transaction_type === 'waste';
                    return (
                      <tr key={t._id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.date || t.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>{txnBadge(t.transaction_type)}</td>
                        <td><strong>{t.material_name}</strong></td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.material_brand || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: isOut ? '#dc2626' : '#059669' }}>
                          {isOut ? '-' : '+'}{t.quantity}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {t.rate > 0 ? `₹${Number(t.rate).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                            background: t.approval_status === 'approved' ? '#ecfdf5' : t.approval_status === 'rejected' ? '#fef2f2' : '#fefce8',
                            color: t.approval_status === 'approved' ? '#10b981' : t.approval_status === 'rejected' ? '#ef4444' : '#b45309'
                          }}>
                            {(t.approval_status || 'PENDING').toUpperCase()}
                          </span>
                        </td>
                        <td>{t.project ? <strong style={{ color: 'var(--primary)' }}>{t.project.name}</strong> : '—'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {t.supplier && <div><strong>{t.supplier}</strong></div>}
                          {t.invoice_number && <div>Inv: {t.invoice_number}</div>}
                        </td>
                        <td style={{ fontStyle: 'italic', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.notes}>{t.notes || '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredLedger.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredLedger.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAllLedger(!showAllLedger)}
                  style={{ fontSize: '12px', padding: '6px 16px', fontWeight: '700' }}
                >
                  {showAllLedger ? '⬆️ Hide/View Recent 10 Only' : `⬇️ View All ${filteredLedger.length} Ledger entries`}
                </button>
              </div>
            )}
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filteredLedger.length} of {transactions.length} entries
            </div>
          </div>
        </div>
      )}

      {/* === TOOLS PANEL === */}
      {openPanel === 'tools' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '1100px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>🔧 Tools & Asset Management</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Workshop tools with handler tracking and asset status</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => handleExportCSV('tools')}>📥 Export Excel</button>
                <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={handleOpenAddTool}>🔧 Register Tool</button>
                <button onClick={() => setOpenPanel(null)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)' }}>✕ Close</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input type="text" className="form-control" placeholder="🔍 Search tools, brand, asset ID, handler..." style={{ flex: 1, minWidth: '200px' }} value={toolsSearch} onChange={e => setToolsSearch(e.target.value)} />
              <select className="form-control" style={{ width: '150px' }} value={toolsStatusFilter} onChange={e => setToolsStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="issued">Issued</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {(showAllTools ? filteredTools : filteredTools.slice(0, 10)).map(tool => (
                <div key={tool._id} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{tool.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Brand: <strong>{tool.make_brand || '—'}</strong> · ID: <strong>{tool.asset_id || '—'}</strong>
                      </div>
                    </div>
                    {getStatusBadge(tool.status)}
                  </div>

                  {tool.photo_url && (
                    <div style={{ width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                      <img src={tool.photo_url} alt={tool.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div>💰 <strong>Worth:</strong> ₹{Number(tool.tool_worth || 0).toLocaleString('en-IN')}</div>
                    {tool.status === 'issued' && (
                      <>
                        <div>👤 <strong>Handler:</strong> {tool.handler_name || '—'} · {tool.handler_contact || 'No contact'}</div>
                        <div>👔 <strong>Supervisor:</strong> {tool.handler_supervisor || '—'}</div>
                        <div>📅 <strong>Issued:</strong> {tool.issue_date ? new Date(tool.issue_date).toLocaleDateString('en-IN') : '—'}</div>
                        {tool.acknowledgement_copy && (
                          <a href={tool.acknowledgement_copy} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '700' }}>
                            View Acknowledgement Copy ↗
                          </a>
                        )}
                      </>
                    )}
                    {tool.previous_handler && (
                      <div style={{ color: 'var(--primary)', fontWeight: '600' }}>📋 Prev Handler: {tool.previous_handler}</div>
                    )}
                    {tool.notes && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>📝 {tool.notes}</div>}
                  </div>

                  <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }} onClick={() => handleOpenEditTool(tool)}>✏️ Edit</button>
                    {tool.status === 'issued' && (
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', border: 'none' }}
                        onClick={() => handleAction('update_tool', { id: tool._id, status: 'available' })}>↩️ Return Asset</button>
                    )}
                    {tool.status === 'available' && (
                      <button className="btn btn-sm btn-primary" style={{ fontSize: '11px' }} onClick={() => handleOpenEditTool(tool)}>Dispatch →</button>
                    )}
                    {tool.status === 'damaged' && (
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}
                        onClick={() => handleAction('update_tool', { id: tool._id, status: 'available' })}>🔨 Mark Repaired</button>
                    )}
                    <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--danger)', border: '1px solid #fca5a5', background: 'none', marginLeft: 'auto' }}
                      onClick={() => handleDelete('delete_tool', tool._id, 'tool')}>🗑️</button>
                  </div>
                </div>
              ))}
              {filteredTools.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tools found</div>
              )}
              </div>
            </div>
            {filteredTools.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAllTools(!showAllTools)}
                  style={{ fontSize: '12px', padding: '6px 16px', fontWeight: '700' }}
                >
                  {showAllTools ? '⬆️ Hide/View Recent 10 Only' : `⬇️ View All ${filteredTools.length} Tools`}
                </button>
              </div>
            )}
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              Showing {filteredTools.length} of {tools.length} tools
            </div>
          </div>
        </div>
      )}

      {/* === MACHINES PANEL === */}
      {openPanel === 'machines' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '1100px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>⚙️ Workshop Machines</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Machine details, service history, and maintenance scheduling</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => handleExportCSV('machines')}>📥 Export Excel</button>
                <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => setActiveForm('add_machine')}>⚙️ Register Machine</button>
                <button onClick={() => setOpenPanel(null)} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)' }}>✕ Close</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input type="text" className="form-control" placeholder="🔍 Search machines, brand..." style={{ flex: 1, minWidth: '200px' }} value={machinesSearch} onChange={e => setMachinesSearch(e.target.value)} />
              <select className="form-control" style={{ width: '160px' }} value={machinesStatusFilter} onChange={e => setMachinesStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="in_service">In Service</option>
                <option value="out_of_order">Out of Order</option>
              </select>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {(showAllMachines ? filteredMachines : filteredMachines.slice(0, 10)).map(m => {
                const serviceDue = m.next_service_due ? new Date(m.next_service_due) : null;
                const isDueOverdue = serviceDue && serviceDue < new Date();
                return (
                  <div key={m._id} style={{
                    background: 'var(--card-bg)', border: `1px solid ${isDueOverdue ? '#fca5a5' : 'var(--card-border)'}`,
                    borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px',
                    boxShadow: isDueOverdue ? '0 0 0 2px #fee2e2' : 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{m.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          Brand: <strong>{m.make_brand || '—'}</strong> · Year: <strong>{m.purchase_year || '—'}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        {getStatusBadge(m.status)}
                        {isDueOverdue && (
                          <span style={{ fontSize: '9px', fontWeight: '800', background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }}>
                            ⚠️ SERVICE OVERDUE
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div>📞 <strong>Service Contact:</strong> {m.service_contact || '—'}</div>
                      <div>📅 <strong>Last Serviced:</strong> {m.last_service_date ? new Date(m.last_service_date).toLocaleDateString('en-IN') : 'N/A'}</div>
                      <div style={{ color: isDueOverdue ? '#dc2626' : 'inherit', fontWeight: isDueOverdue ? '700' : '400' }}>
                        ⏳ <strong>Next Service Due:</strong> {serviceDue ? serviceDue.toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                      <div style={{ color: 'var(--primary)', fontWeight: '700' }}>
                        💰 <strong>Total Maintenance:</strong> ₹{Number(m.service_expenses_total || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {m.service_history && m.service_history.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Service History</div>
                        <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {m.service_history.map((h, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fafafa', borderRadius: '4px', fontSize: '11px' }}>
                              <span>{new Date(h.service_date).toLocaleDateString('en-IN')} — {h.description}</span>
                              <strong style={{ color: 'var(--danger)' }}>₹{h.expenses}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="no-print" style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }} onClick={() => handleOpenEditMachine(m)}>✏️ Edit</button>
                      <button className="btn btn-sm btn-primary" style={{ fontSize: '11px' }}
                        onClick={() => { setSelectedItem(m); setServiceForm({ expenses: '', description: '', next_service_due: '', status: 'available' }); setActiveForm('service_machine'); }}>
                        🔧 Record Service
                      </button>
                      <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--danger)', border: '1px solid #fca5a5', background: 'none', marginLeft: 'auto' }}
                        onClick={() => handleDelete('delete_machine', m._id, 'machine')}>🗑️</button>
                    </div>
                  </div>
                );
              })}
              {filteredMachines.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No machines found</div>
              )}
              </div>
            </div>
            {filteredMachines.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAllMachines(!showAllMachines)}
                  style={{ fontSize: '12px', padding: '6px 16px', fontWeight: '700' }}
                >
                  {showAllMachines ? '⬆️ Hide/View Recent 10 Only' : `⬇️ View All ${filteredMachines.length} Machines`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          FORM MODALS
      ================================================================ */}

      {/* 1. Log Purchase Modal (Multi-Item Invoice with GST & Transport) */}
      {activeForm === 'purchase' && (() => {
        const itemsTotal = purchaseForm.items.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const rate = Number(item.rate) || 0;
          const gst = Number(item.gst_percentage) || 0;
          return sum + (qty * rate * (1 + gst / 100));
        }, 0);
        const transportVal = Number(purchaseForm.transport_charges) || 0;
        const dividedTransport = purchaseForm.items.length > 0 ? transportVal / purchaseForm.items.length : 0;
        const grandTotal = itemsTotal + transportVal;
        console.log('[DEBUG] purchaseForm items:', JSON.stringify(purchaseForm.items), 'itemsTotal:', itemsTotal, 'grandTotal:', grandTotal);

        return (
          <div className="modal-backdrop">
            <form className="modal-content" style={{ maxWidth: '1320px', maxHeight: '90vh', overflowY: 'auto' }} 
              onSubmit={(e) => { 
                e.preventDefault(); 
                // Basic frontend validation
                for (const [idx, item] of purchaseForm.items.entries()) {
                  if (Number(item.damaged_quantity || 0) > Number(item.quantity || 0)) {
                    alert(`Row #${idx + 1}: Damaged quantity cannot exceed total quantity.`);
                    return;
                  }
                }
                handleAction('add_batch_purchase', purchaseForm); 
              }}
            >
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">📥 Log New Purchase Invoice</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Record materials, GST, and transport charges under a single invoice (requires CEO approval)
                  </div>
                </div>
                <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
              </div>

              {/* Invoice Info */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Invoice Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Invoice Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" required placeholder="E.g. INV-2026-004"
                      value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Supplier (Where Purchased) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" required placeholder="E.g. Sri Balaji Hardware, Udumalpet"
                      value={purchaseForm.supplier} onChange={e => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.8fr', gap: '12px', marginTop: '4px' }}>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input type="date" className="form-control"
                      value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Transport Charges (₹)</label>
                    <input type="number" className="form-control" placeholder="0" min="0"
                      value={purchaseForm.transport_charges} onChange={e => setPurchaseForm({ ...purchaseForm, transport_charges: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Invoice Notes (Optional)</label>
                    <input type="text" className="form-control" placeholder="E.g. Delivery terms, payment status..."
                      value={purchaseForm.notes} onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Materials List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Invoice Items
                  </h4>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', background: '#ecfdf5', color: '#047857', border: 'none', fontWeight: 'bold' }} 
                    onClick={addPurchaseItem}>
                    ➕ Add Item to Invoice
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {purchaseForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      
                      <span style={{ alignSelf: 'center', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', minWidth: '20px' }}>
                        #{idx + 1}
                      </span>

                      {/* Material Name */}
                      <div style={{ flex: 2.2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Material Name *</label>
                        <input type="text" className="form-control" required list="existing-material-names"
                          placeholder="Marine Plywood" value={item.material_name}
                          onChange={e => updatePurchaseItem(idx, 'material_name', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                      </div>

                      {/* Brand */}
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Brand</label>
                        <input type="text" className="form-control" placeholder="CenturyPly" value={item.material_brand}
                          onChange={e => updatePurchaseItem(idx, 'material_brand', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                      </div>

                      {/* Quantity */}
                      <div style={{ flex: 0.9 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Qty ({getDynamicQtyLabel(item.unit)}) *</label>
                        <input type="number" step="any" className="form-control" required placeholder={`How many ${getDynamicQtyLabel(item.unit)}?`} value={item.quantity}
                          onChange={e => updatePurchaseItem(idx, 'quantity', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                      </div>

                      {/* Unit */}
                      <div style={{ flex: 1.4 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Unit *</label>
                        <select className="form-control" required value={item.unit}
                          onChange={e => updatePurchaseItem(idx, 'unit', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px', height: '31px' }}>
                          <option value="pcs">pcs (Pieces)</option>
                          <option value="mtr">mtr (Meters)</option>
                          <option value="kg">kg (Kilograms)</option>
                          <option value="ltr">ltr (Litres)</option>
                          <option value="cm">cm (Centimeters)</option>
                          <option value="inch">inch (Inches)</option>
                          <option value="mm">mm (Millimeters)</option>
                          <option value="rft">rft (Running Feet)</option>
                          <option value="sqt">sqt (Square Feet)</option>
                          <option value="box">box (Boxes)</option>
                        </select>
                      </div>

                      {/* Rate */}
                      <div style={{ flex: 1.2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Rate *</label>
                        <input type="number" className="form-control" required placeholder="1500" value={item.rate}
                          onChange={e => updatePurchaseItem(idx, 'rate', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                      </div>

                      {/* GST (%) */}
                      <div style={{ flex: 1.1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>GST (%)</label>
                        <select className="form-control" value={item.gst_percentage}
                          onChange={e => updatePurchaseItem(idx, 'gst_percentage', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px', height: '31px' }}>
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      {/* Transport Allocation */}
                      <div style={{ flex: 1.1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Trans (Rs.)</label>
                        <div style={{ padding: '6px 0', fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          Rs. {dividedTransport.toFixed(2)}
                        </div>
                      </div>

                      {/* Damaged */}
                      <div style={{ flex: 1.0 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Damaged</label>
                        <input type="number" className="form-control" placeholder="0" min="0" max={item.quantity || 99999} value={item.damaged_quantity}
                          onChange={e => updatePurchaseItem(idx, 'damaged_quantity', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                      </div>

                      {/* Rack Code Selector */}
                      <div style={{ flex: 1.3 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Put in Rack</label>
                        <select className="form-control" value={item.rack_code}
                          onChange={e => updatePurchaseItem(idx, 'rack_code', e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px', height: '31px' }}>
                          <option value="">-- No Rack --</option>
                          {racksList
                            .filter(r => !r.material_name || r.material_name.toLowerCase().trim() === (item.material_name || '').toLowerCase().trim())
                            .map(r => (
                              <option key={r.rack_code} value={r.rack_code}>{r.rack_code} {r.material_name ? '(Assigned)' : '(Empty)'}</option>
                            ))
                          }
                        </select>
                      </div>

                      {/* Total */}
                      <div style={{ flex: 1.4, minWidth: '80px', textAlign: 'right' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Total (Rs.)</label>
                        <div style={{ padding: '6px 0', fontSize: '12.5px', fontWeight: 'bold', color: 'var(--text-main)' }} title="Base Cost + GST + Allocated Transport">
                          Rs. {((Number(item.quantity) || 0) * (Number(item.rate) || 0) * (1 + (Number(item.gst_percentage) || 0) / 100) + dividedTransport).toFixed(2)}
                        </div>
                      </div>

                      {/* Remove Action */}
                      {purchaseForm.items.length > 1 && (
                        <div style={{ flex: 0.4, alignSelf: 'flex-end', display: 'flex', justifyContent: 'center' }}>
                          <button type="button" onClick={() => removePurchaseItem(idx)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '16px', padding: '4px' }} title="Delete item">
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <datalist id="existing-material-names">{materials.map(m => <option key={m._id} value={m.name} />)}</datalist>
              </div>

              {/* Bottom total summary & buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                  🧾 Grand Total: <span style={{ color: 'var(--primary)', fontSize: '18px' }}>₹{grandTotal.toFixed(2)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px', fontWeight: 'normal' }}>
                    (Items: ₹{itemsTotal.toFixed(2)} + Transport: ₹{transportVal.toFixed(2)})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">💾 Save Purchase Invoice</button>
                </div>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Receive Vendor Replacement Modal */}
      {activeForm === 'receive_replacement' && selectedItem && (
        <div className="modal-backdrop">
          <form 
            className="modal-content" 
            style={{ maxWidth: '480px' }} 
            onSubmit={(e) => { 
              e.preventDefault(); 
              const remaining = selectedItem.damaged_quantity - (selectedItem.replacement_received_quantity || 0);
              if (Number(replacementForm.received_quantity) > remaining) {
                alert(`Received quantity cannot exceed remaining pending replacement quantity (${remaining}).`);
                return;
              }
              handleAction('receive_replacement', replacementForm); 
            }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🔄 Receive Vendor Replacement</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Log replacement items received from vendor for invoice: <strong>{selectedItem.invoice_number}</strong>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Material Item:</div>
              <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '15px' }}>{selectedItem.material_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12.5px' }}>
                <span>Damaged Count: <strong>{selectedItem.damaged_quantity} units</strong></span>
                <span>Already Replaced: <strong>{selectedItem.replacement_received_quantity || 0} units</strong></span>
              </div>
            </div>

            <div className="form-group">
              <label>Quantity Received <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="number" 
                className="form-control" 
                required 
                min="1" 
                max={selectedItem.damaged_quantity - (selectedItem.replacement_received_quantity || 0)}
                placeholder={`Max: ${selectedItem.damaged_quantity - (selectedItem.replacement_received_quantity || 0)}`}
                value={replacementForm.received_quantity} 
                onChange={e => setReplacementForm({ ...replacementForm, received_quantity: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label>Notes / Remarks (Optional)</label>
              <textarea 
                className="form-control" 
                rows="2" 
                placeholder="E.g. Received batch #2 replacements"
                value={replacementForm.notes} 
                onChange={e => setReplacementForm({ ...replacementForm, notes: e.target.value })} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">📦 Log Replacement</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Add Old Stock Modal */}
      {activeForm === 'old_stock' && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '850px', padding: '24px' }} onSubmit={(e) => { e.preventDefault(); handleAction('add_old_stock', { ...oldStockForm, invoice_number: oldStockForm.invoice_number || 'OLD-STOCK', supplier: oldStockForm.supplier || 'Pre-existing Stock' }); }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">📦 Add Old / Existing Stock</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Add stock that was already purchased — invoice number is optional</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#1d4ed8' }}>
              ℹ️ Use this form for stock you already have but haven't recorded yet. Invoice number is not mandatory here.
            </div>

            {/* Row 1: Name, Brand, Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.3fr 1.3fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Material Name *</label>
                <input type="text" className="form-control" required list="existing-material-names-2"
                  placeholder="E.g. Marine Plywood 18mm" value={oldStockForm.material_name}
                  onChange={e => setOldStockForm({ ...oldStockForm, material_name: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px' }} />
                <datalist id="existing-material-names-2">{materials.map(m => <option key={m._id} value={m.name} />)}</datalist>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Material Brand</label>
                <input type="text" className="form-control" placeholder="E.g. CenturyPly"
                  value={oldStockForm.material_brand} onChange={e => setOldStockForm({ ...oldStockForm, material_brand: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px' }} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Purchase Date (Optional)</label>
                <input type="date" className="form-control"
                  value={oldStockForm.purchase_date} onChange={e => setOldStockForm({ ...oldStockForm, purchase_date: e.target.value })}
                  style={{ padding: '7px 12px', fontSize: '13px' }} />
              </div>
            </div>

            {/* Row 2: Quantity, Unit, Rate, Rack */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 1fr 1.3fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Qty ({getDynamicQtyLabel(oldStockForm.unit)}) *</label>
                <input type="number" step="any" className="form-control" required placeholder={`How many ${getDynamicQtyLabel(oldStockForm.unit)}?`}
                  value={oldStockForm.quantity} onChange={e => setOldStockForm({ ...oldStockForm, quantity: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px' }} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Unit *</label>
                <select className="form-control" required value={oldStockForm.unit} onChange={e => setOldStockForm({ ...oldStockForm, unit: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px', height: '35px' }}>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="mtr">mtr (Meters)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="ltr">ltr (Litres)</option>
                  <option value="cm">cm (Centimeters)</option>
                  <option value="inch">inch (Inches)</option>
                  <option value="mm">mm (Millimeters)</option>
                  <option value="rft">rft (Running Feet)</option>
                  <option value="sqt">sqt (Square Feet)</option>
                  <option value="box">box (Boxes)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Rate (₹) (Opt)</label>
                <input type="number" className="form-control" placeholder="1500"
                  value={oldStockForm.rate} onChange={e => setOldStockForm({ ...oldStockForm, rate: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px' }} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Put in Rack</label>
                <select className="form-control" value={oldStockForm.rack_code} onChange={e => setOldStockForm({ ...oldStockForm, rack_code: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '13px', height: '35px' }}>
                  <option value="">-- Choose Rack --</option>
                  {racksList
                    .filter(r => !r.material_name || r.material_name.toLowerCase().trim() === (oldStockForm.material_name || '').toLowerCase().trim())
                    .map(r => (
                      <option key={r.rack_code} value={r.rack_code}>{r.rack_code} {r.material_name ? '(Assigned)' : '(Empty)'}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Notes / Remarks</label>
              <textarea className="form-control" rows="2" placeholder="E.g. Stock from previous project, found in warehouse..."
                value={oldStockForm.notes} onChange={e => setOldStockForm({ ...oldStockForm, notes: e.target.value })}
                style={{ padding: '8px 12px', fontSize: '13px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', fontWeight: '800' }}>💾 Add Old Stock</button>
            </div>
          </form>
        </div>
      )}



      {/* 3. Multi-Item Issue Stock Modal */}
      {activeForm === 'issue' && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📤 Issue Stock to Project (Multi-Item)</h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => { setActiveForm(null); setModalMaterialSearch(''); }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', marginTop: '8px' }}>
              {/* Left Column: Search & Select Materials */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Select Materials in Stock
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {issueItems.filter(item => item.material_name && Number(item.quantity) > 0).length} items selected
                  </span>
                </div>

                {/* Local Material Search Bar */}
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="🔍 Search materials to issue..." 
                  value={modalMaterialSearch}
                  onChange={e => setModalMaterialSearch(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
                />

                {/* Materials List with checkboxes and qty inputs */}
                <div style={{ 
                  maxHeight: '500px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  paddingRight: '6px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '8px',
                  backgroundColor: '#fafafa'
                }}>
                  {materials
                    .filter(m => m.current_stock > 0 && (modalMaterialSearch === '' || m.name.toLowerCase().includes(modalMaterialSearch.toLowerCase())))
                    .map(m => {
                      const selectedItem = issueItems.find(i => i.material_name === m.name);
                      const isChecked = !!selectedItem;
                      const currentQty = selectedItem ? selectedItem.quantity : '';

                      return (
                        <div 
                          key={m._id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: isChecked ? 'var(--primary-light)' : '#ffffff',
                            border: isChecked ? '1px solid var(--primary-border)' : '1px solid #e8ebf0',
                            borderRadius: '8px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleIssueMaterial(m.name)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Available: <strong>{m.current_stock} {m.unit}</strong>
                              </div>
                            </div>
                          </label>

                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty ({getDynamicQtyLabel(m.unit)}):</span>
                              <input 
                                type="number" 
                                step="any"
                                className="form-control" 
                                required 
                                min="0.001"
                                max={m.current_stock}
                                value={currentQty} 
                                placeholder={getDynamicQtyLabel(m.unit)}
                                onChange={e => handleUpdateIssueQuantity(m.name, e.target.value)}
                                style={{ width: '90px', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '4px' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {materials.filter(m => m.current_stock > 0 && (modalMaterialSearch === '' || m.name.toLowerCase().includes(modalMaterialSearch.toLowerCase()))).length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px', fontStyle: 'italic' }}>
                      No available materials match search.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Destination Details */}
              <form 
                onSubmit={handleBatchIssueSubmit} 
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}
              >
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Destination Details
                </h4>

                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '800' }}>Select Destination Project</label>
                  <select 
                    className="form-control" 
                    required 
                    value={issueProject} 
                    onChange={e => setIssueProject(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {issueProject && (() => {
                  const selectedProjObj = projects.find(p => p._id === issueProject);
                  const clientId = selectedProjObj?.client?._id || selectedProjObj?.client;
                  const projectDesigns = getApprovedDesignsForClient(clientId);
                  if (projectDesigns.length === 0) {
                    return (
                      <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '11px', color: '#dc2626', fontWeight: '500' }}>
                        ⚠️ No approved 2D/3D design plans found for this client. Please upload/approve designs in the 2D & 3D panel first.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        📐 Linked Approved Designs & Plans
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {projectDesigns.map(d => (
                          <div key={d._id} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                              <strong style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }} title={d.file_name}>
                                {d.file_name}
                              </strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {d.design_type === '2d' ? '📐 2D Layout Plan' : '🕶️ 3D Perspective'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', textDecoration: 'none' }}>👁️ View</a>
                              <a href={d.file_url} download={d.file_name} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', textDecoration: 'none' }}>📥 Down</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '800' }}>Allocation Notes</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Enter dispatch notes, delivery details, etc..."
                    value={issueNotes} 
                    onChange={e => setIssueNotes(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                {/* Selected Items Summary List */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  fontSize: '12px', 
                  flexGrow: 1, 
                  maxHeight: '130px', 
                  overflowY: 'auto' 
                }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '6px' }}>Selected Items:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {issueItems
                      .filter(i => i.material_name && Number(i.quantity) > 0)
                      .map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                          <span>• {item.material_name}</span>
                          <strong>{item.quantity} units</strong>
                        </div>
                      ))}
                    {issueItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0 && (
                      <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '11px' }}>
                        No items selected. Use the list on the left to add items.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setActiveForm(null); setModalMaterialSearch(''); }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={issueItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0}
                  >
                    Dispatch Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Multi-Item Return Stock Modal */}
      {activeForm === 'return' && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '1250px', width: '95%', padding: '24px' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ paddingBottom: '10px', borderBottom: 'none' }}>
              <h3 className="modal-title">↩️ Project Return & Verification Portal</h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => { setActiveForm(null); setModalMaterialSearch(''); setSelectedPendingReturn(null); }}
              >
                ×
              </button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', marginBottom: '16px', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setReturnActiveTab('log')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: returnActiveTab === 'log' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  fontWeight: returnActiveTab === 'log' ? '800' : '600',
                  color: returnActiveTab === 'log' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                📝 Log New Return
              </button>
              <button
                type="button"
                onClick={() => {
                  setReturnActiveTab('approve');
                  setSelectedPendingReturn(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: returnActiveTab === 'approve' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  fontWeight: returnActiveTab === 'approve' ? '800' : '600',
                  color: returnActiveTab === 'approve' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                ♻️ Verify Returns (Stock Approval)
                {pendingStockVerifications.length > 0 && (
                  <span style={{
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {pendingStockVerifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Log New Return */}
            {returnActiveTab === 'log' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                {/* Left Column: Search & Select Materials */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Select Materials to Return
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
                      {returnItems.filter(item => item.material_name && Number(item.quantity) > 0).length} items selected
                    </span>
                  </div>

                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="🔍 Search materials to return..." 
                    value={modalMaterialSearch}
                    onChange={e => setModalMaterialSearch(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
                  />

                  {/* Scrollable list */}
                  <div style={{ 
                    maxHeight: '500px', 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    paddingRight: '6px',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '8px',
                    backgroundColor: '#fafafa'
                  }}>
                    {materials
                      .filter(m => modalMaterialSearch === '' || m.name.toLowerCase().includes(modalMaterialSearch.toLowerCase()))
                      .map(m => {
                        const selectedItem = returnItems.find(i => i.material_name === m.name);
                        const isChecked = !!selectedItem;
                        const currentQty = selectedItem ? selectedItem.quantity : '';

                        return (
                          <div 
                            key={m._id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              background: isChecked ? 'var(--primary-light)' : '#ffffff',
                              border: isChecked ? '1px solid var(--primary-border)' : '1px solid #e8ebf0',
                              borderRadius: '8px',
                              transition: 'all 0.15s'
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, margin: 0 }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => handleToggleReturnMaterial(m.name)}
                                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{m.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unit: {m.unit}</div>
                              </div>
                            </label>

                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty ({getDynamicQtyLabel(m.unit)}):</span>
                                <input 
                                  type="number" 
                                  step="any"
                                  className="form-control" 
                                  required 
                                  min="0.001"
                                  value={currentQty} 
                                  placeholder={getDynamicQtyLabel(m.unit)}
                                  onChange={e => handleUpdateReturnQuantity(m.name, e.target.value)}
                                  style={{ width: '90px', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '4px' }}
                                />

                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>Rack:</span>
                                <select
                                  className="form-control"
                                  required
                                  value={selectedItem.rack_code || ''}
                                  onChange={e => handleUpdateReturnRack(m.name, e.target.value)}
                                  style={{ width: '100px', padding: '4px 6px', fontSize: '12px', height: '28px', borderRadius: '4px' }}
                                >
                                  <option value="">-- Choose --</option>
                                  {racksList
                                    .filter(r => !r.material_name || r.material_name.toLowerCase().trim() === m.name.toLowerCase().trim())
                                    .map(r => (
                                      <option key={r.rack_code} value={r.rack_code}>{r.rack_code}</option>
                                    ))
                                  }
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Right Column: Source Details & Save */}
                <form 
                  onSubmit={handleBatchReturnSubmit} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}
                >
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Source Details
                  </h4>

                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '800' }}>Select Source Project</label>
                    <select 
                      className="form-control" 
                      required 
                      value={returnProject} 
                      onChange={e => setReturnProject(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {returnProject && (() => {
                    const selectedProjObj = projects.find(p => p._id === returnProject);
                    const clientId = selectedProjObj?.client?._id || selectedProjObj?.client;
                    const projectDesigns = getApprovedDesignsForClient(clientId);
                    if (projectDesigns.length === 0) {
                      return (
                        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '11px', color: '#dc2626', fontWeight: '500' }}>
                          ⚠️ No approved 2D/3D design plans found for this client. Please upload/approve designs in the 2D & 3D panel first.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          📐 Linked Approved Designs & Plans
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {projectDesigns.map(d => (
                            <div key={d._id} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                                <strong style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }} title={d.file_name}>
                                  {d.file_name}
                                </strong>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {d.design_type === '2d' ? '📐 2D Layout Plan' : '🕶️ 3D Perspective'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', textDecoration: 'none' }}>👁️ View</a>
                                <a href={d.file_url} download={d.file_name} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', textDecoration: 'none' }}>📥 Down</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '800' }}>Return Notes (Reason & Condition)</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      placeholder="Enter return notes (E.g. Surplus wood sheets returned from site)..."
                      value={returnNotes} 
                      onChange={e => setReturnNotes(e.target.value)}
                      style={{ fontSize: '13px' }}
                    />
                  </div>

                  {/* Summary list */}
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '12px', 
                    flexGrow: 1, 
                    maxHeight: '130px', 
                    overflowY: 'auto' 
                  }}>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '6px' }}>Returning Items:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {returnItems
                        .filter(i => i.material_name && Number(i.quantity) > 0)
                        .map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                            <span>• {item.material_name}</span>
                            <strong>{item.quantity} units</strong>
                          </div>
                        ))}
                      {returnItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0 && (
                        <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '11px' }}>
                          No items selected. Use the list on the left to add items.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => { setActiveForm(null); setModalMaterialSearch(''); }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={returnItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0}
                    >
                      Save Return
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: Verify Pending Returns (CEO Approved -> Stock Team Verify) */}
            {returnActiveTab === 'approve' && (() => {
              // Extract and group pending returns
              const groupedPendingReturns = [];
              const batchMap = {};
              
              pendingStockVerifications.forEach(t => {
                const key = t.batch_id || `single-${t._id}`;
                if (!batchMap[key]) {
                  batchMap[key] = {
                    key,
                    batch_id: t.batch_id || null,
                    project: t.project,
                    date: t.date || t.createdAt,
                    notes: t.notes,
                    items: []
                  };
                  groupedPendingReturns.push(batchMap[key]);
                }
                batchMap[key].items.push(t);
              });

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', height: '400px' }}>
                  {/* Left Column: List of Pending Batches */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Pending Return Batches ({groupedPendingReturns.length})
                    </h4>
                    
                    <div style={{ 
                      flexGrow: 1, 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      paddingRight: '6px'
                    }}>
                      {groupedPendingReturns.map(batch => {
                        const isSelected = selectedPendingReturn?.key === batch.key;
                        return (
                          <div 
                            key={batch.key} 
                            onClick={() => setSelectedPendingReturn(batch)}
                            style={{ 
                              padding: '12px 14px', 
                              backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff', 
                              border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--card-border)', 
                              borderRadius: '8px', 
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                                {batch.project?.name || 'N/A Project'}
                              </strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {new Date(batch.date).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Items: <strong>{batch.items.map(i => `${i.quantity} x ${i.material_name}`).join(', ')}</strong>
                            </div>
                          </div>
                        );
                      })}
                      {groupedPendingReturns.length === 0 && (
                        <div style={{ 
                          padding: '40px 20px', 
                          textAlign: 'center', 
                          color: 'var(--text-light)', 
                          fontSize: '13px', 
                          fontStyle: 'italic',
                          border: '1px dashed var(--card-border)',
                          borderRadius: '8px'
                        }}>
                          🎉 No pending returns awaiting stock team verification.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Details & Verification Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                    {selectedPendingReturn ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Verification Details
                          </h4>
                          <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                            {selectedPendingReturn.project?.name || 'N/A Project'}
                          </h3>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Source Client: {selectedPendingReturn.project?.client?.company || 'N/A'}
                          </div>
                          {selectedPendingReturn.notes && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px 12px', 
                              backgroundColor: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              color: 'var(--text-main)',
                              fontStyle: 'italic'
                            }}>
                              📝 Note: "{selectedPendingReturn.notes}"
                            </div>
                          )}
                        </div>

                        {/* List of items inside selected batch */}
                        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                          <strong style={{ fontSize: '12px', display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Items List to Audit & Return to Stock:
                          </strong>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '6px 0' }}>Material</th>
                                <th style={{ padding: '6px 0', textAlign: 'right' }}>Returned Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPendingReturn.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                                  <td style={{ padding: '6px 0', fontWeight: '600', color: 'var(--text-main)' }}>{item.material_name}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                          <button 
                            type="button" 
                            className="btn" 
                            onClick={() => handleVerifyBatchReturn(selectedPendingReturn, false)}
                            style={{ 
                              flex: 1, 
                              backgroundColor: '#fee2e2', 
                              color: '#dc2626', 
                              border: '1px solid #fecaca', 
                              fontWeight: '700', 
                              fontSize: '12px',
                              padding: '10px'
                            }}
                          >
                            ❌ Deny Verification
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={() => handleVerifyBatchReturn(selectedPendingReturn, true)}
                            style={{ 
                              flex: 1.5, 
                              backgroundColor: '#10b981', 
                              borderColor: '#10b981', 
                              fontWeight: '800', 
                              color: '#ffffff',
                              fontSize: '12px',
                              padding: '10px'
                            }}
                          >
                            ✅ Accept to Stock
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%', 
                        color: 'var(--text-light)', 
                        textAlign: 'center' 
                      }}>
                        <span style={{ fontSize: '40px', marginBottom: '10px' }}>♻️</span>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>Select a return batch from the left to verify</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>Verify items physically match the list before accepting to stock</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* 5. Multi-Item Waste Write-off Modal */}
      {activeForm === 'waste' && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '1250px', width: '95%', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>🗑️ Write-off Waste Material (Multi-Item)</h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => { setActiveForm(null); setModalMaterialSearch(''); }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', marginTop: '8px' }}>
              {/* Left Column: Search & Select Materials */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Select Materials to Write off
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 'bold' }}>
                    {wasteItems.filter(item => item.material_name && Number(item.quantity) > 0).length} items selected
                  </span>
                </div>

                {/* Local Material Search Bar */}
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="🔍 Search materials to write off..." 
                  value={modalMaterialSearch}
                  onChange={e => setModalMaterialSearch(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}
                />

                {/* Materials List with checkboxes and qty inputs */}
                <div style={{ 
                  maxHeight: '480px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  paddingRight: '6px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '8px',
                  backgroundColor: '#fafafa'
                }}>
                  {materials
                    .filter(m => m.current_stock > 0 && (modalMaterialSearch === '' || m.name.toLowerCase().includes(modalMaterialSearch.toLowerCase())))
                    .map(m => {
                      const selectedItem = wasteItems.find(i => i.material_name === m.name);
                      const isChecked = !!selectedItem;
                      const currentQty = selectedItem ? selectedItem.quantity : '';

                      return (
                        <div 
                          key={m._id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: isChecked ? 'rgba(220,38,38,0.05)' : '#ffffff',
                            border: isChecked ? '1.5px solid rgba(220,38,38,0.2)' : '1px solid #e8ebf0',
                            borderRadius: '8px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleWasteMaterial(m.name)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {m.current_stock} {m.unit} · Rate: ₹{(m.last_rate || 0).toLocaleString()}</div>
                            </div>
                          </label>

                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty ({getDynamicQtyLabel(m.unit)}):</span>
                              <input 
                                type="number" 
                                step="any"
                                className="form-control" 
                                required 
                                min="0.001"
                                max={m.current_stock}
                                value={currentQty} 
                                placeholder={getDynamicQtyLabel(m.unit)}
                                onChange={e => handleUpdateWasteQuantity(m.name, e.target.value)}
                                style={{ width: '90px', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '4px' }}
                              />

                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>Bin:</span>
                              <select
                                className="form-control"
                                required
                                value={selectedItem.waste_bin_code || ''}
                                onChange={e => handleUpdateWasteBin(m.name, e.target.value)}
                                style={{ width: '110px', padding: '4px 6px', fontSize: '12px', height: '28px', borderRadius: '4px' }}
                              >
                                <option value="">-- Choose Bin --</option>
                                {wasteBinsList.map(b => (
                                  <option key={b.bin_code} value={b.bin_code}>{b.bin_code} ({b.category_name || 'General'})</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {materials.filter(m => m.current_stock > 0 && (modalMaterialSearch === '' || m.name.toLowerCase().includes(modalMaterialSearch.toLowerCase()))).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: '12px' }}>
                      No available materials match search.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Destination Details & Save */}
              <form 
                onSubmit={handleBatchWasteSubmit} 
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}
              >
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Wastage Details
                </h4>

                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '800' }}>Allocate Wastage to Project</label>
                  <select 
                    className="form-control" 
                    value={wasteProject} 
                    onChange={e => setWasteProject(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  >
                    <option value="">-- General Waste (No Specific Project) --</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '800' }}>Reason / Notes</label>
                  <textarea 
                    className="form-control" 
                    required
                    rows="3" 
                    placeholder="Enter reason for wastage (E.g. Damaged during cut assembly, board defects)..."
                    value={wasteNotes} 
                    onChange={e => setWasteNotes(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                {/* Summary list with calculated values */}
                {(() => {
                  let totalWastageValue = 0;
                  const itemSummaries = wasteItems
                    .filter(i => i.material_name && Number(i.quantity) > 0)
                    .map((item) => {
                      const mat = materials.find(m => m.name === item.material_name);
                      const unitRate = mat ? (mat.last_rate || 0) : 0;
                      const itemVal = unitRate * Number(item.quantity);
                      totalWastageValue += itemVal;
                      return {
                        name: item.material_name,
                        qty: item.quantity,
                        unit: mat ? mat.unit : 'pcs',
                        value: itemVal
                      };
                    });

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                      <div style={{ 
                        background: 'rgba(220,38,38,0.02)', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(220,38,38,0.1)', 
                        fontSize: '12px', 
                        maxHeight: '150px', 
                        overflowY: 'auto' 
                      }}>
                        <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '6px' }}>Wasted Items:</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {itemSummaries.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                              <span>• {item.name} ({item.qty} {item.unit})</span>
                              <strong>₹{item.value.toLocaleString()}</strong>
                            </div>
                          ))}
                          {itemSummaries.length === 0 && (
                            <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '11px' }}>
                              No items selected. Use the list on the left to add items.
                            </div>
                          )}
                        </div>
                      </div>

                      {itemSummaries.length > 0 && (
                        <div style={{
                          background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px',
                          padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 'bold' }}>Total Wastage Value:</span>
                          <strong style={{ fontSize: '15px', color: 'var(--danger)' }}>₹{totalWastageValue.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setActiveForm(null); setModalMaterialSearch(''); }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn"
                    disabled={wasteItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0}
                    style={{
                      backgroundColor: 'var(--danger)', color: '#fff', border: 'none',
                      borderRadius: 'var(--border-radius-sm)', padding: '10px 20px', fontWeight: '800',
                      fontSize: '13px', cursor: 'pointer', opacity: wasteItems.filter(i => i.material_name && Number(i.quantity) > 0).length === 0 ? 0.6 : 1
                    }}
                  >
                    Record Waste
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 6. Register Tool Modal */}
      {activeForm === 'add_tool' && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '560px' }} onSubmit={(e) => { e.preventDefault(); handleAction('add_tool', toolForm); }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🔧 Register New Tool</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Add a new tool to the asset registry</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Tool Name</label>
              <input type="text" className="form-control" required placeholder="E.g. Makita Circular Saw MT-22"
                value={toolForm.name} onChange={e => setToolForm({ ...toolForm, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Make / Brand</label>
                <input type="text" className="form-control" required placeholder="E.g. Bosch, Makita"
                  value={toolForm.make_brand} onChange={e => setToolForm({ ...toolForm, make_brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Asset ID</label>
                <input type="text" className="form-control" required placeholder="TL-MAK-020"
                  value={toolForm.asset_id} onChange={e => setToolForm({ ...toolForm, asset_id: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Tool Worth (₹)</label>
                <input type="number" className="form-control" required placeholder="14500"
                  value={toolForm.tool_worth} onChange={e => setToolForm({ ...toolForm, tool_worth: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Photo URL (Optional)</label>
                <input type="text" className="form-control" placeholder="https://..."
                  value={toolForm.photo_url} onChange={e => setToolForm({ ...toolForm, photo_url: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Asset Status</label>
              <select className="form-control" value={toolForm.status} onChange={e => {
                const newStatus = e.target.value;
                setToolForm(prev => ({
                  ...prev,
                  status: newStatus,
                  issue_date: newStatus === 'issued' && !prev.issue_date ? new Date().toISOString().split('T')[0] : prev.issue_date
                }));
              }}>
                <option value="available">Available</option>
                <option value="issued">Issued to Handler</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {toolForm.status === 'issued' && (
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>👤 Handler Assignment</div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Handler Name</label>
                  <input type="text" className="form-control" required placeholder="E.g. Ganesh Kumar"
                    value={toolForm.handler_name} onChange={e => setToolForm({ ...toolForm, handler_name: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Handler Contact</label>
                    <input type="text" className="form-control" required placeholder="+91..."
                      value={toolForm.handler_contact} onChange={e => setToolForm({ ...toolForm, handler_contact: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Supervisor</label>
                    <input type="text" className="form-control" placeholder="Supervisor name"
                      value={toolForm.handler_supervisor} onChange={e => setToolForm({ ...toolForm, handler_supervisor: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Issue Date</label>
                    <input type="date" className="form-control" required value={toolForm.issue_date} onChange={e => setToolForm({ ...toolForm, issue_date: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Acknowledgement Copy (Link / Upload)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-control" placeholder="Link or uploaded path" style={{ flex: 1 }}
                        value={toolForm.acknowledgement_copy} onChange={e => setToolForm({ ...toolForm, acknowledgement_copy: e.target.value })} />
                      <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: '4px 10px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {uploading ? '⌛ Uploading...' : '📤 Upload'}
                        <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={(e) => handleFileUpload(e, 'acknowledgement_copy')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes / Storage Location</label>
              <textarea className="form-control" rows="2" placeholder="Optional notes"
                value={toolForm.notes} onChange={e => setToolForm({ ...toolForm, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Tool</button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Edit Tool Modal */}
      {activeForm === 'edit_tool' && selectedItem && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={(e) => { e.preventDefault(); handleAction('update_tool', toolForm); }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Tool: {selectedItem.name}</h3>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Tool Name</label>
              <input type="text" className="form-control" required value={toolForm.name} onChange={e => setToolForm({ ...toolForm, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Make / Brand</label>
                <input type="text" className="form-control" required value={toolForm.make_brand} onChange={e => setToolForm({ ...toolForm, make_brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Asset ID</label>
                <input type="text" className="form-control" required value={toolForm.asset_id} onChange={e => setToolForm({ ...toolForm, asset_id: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Tool Worth (₹)</label>
                <input type="number" className="form-control" required value={toolForm.tool_worth} onChange={e => setToolForm({ ...toolForm, tool_worth: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Photo URL</label>
                <input type="text" className="form-control" value={toolForm.photo_url} onChange={e => setToolForm({ ...toolForm, photo_url: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Asset Status</label>
              <select className="form-control" value={toolForm.status} onChange={e => setToolForm({ ...toolForm, status: e.target.value })}>
                <option value="available">Available</option>
                <option value="issued">Issued to Handler</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {toolForm.status === 'issued' && (
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>👤 Handler Assignment</div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Handler Name</label>
                  <input type="text" className="form-control" required placeholder="E.g. Ganesh Kumar"
                    value={toolForm.handler_name} onChange={e => setToolForm({ ...toolForm, handler_name: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Handler Contact</label>
                    <input type="text" className="form-control" required placeholder="+91..."
                      value={toolForm.handler_contact} onChange={e => setToolForm({ ...toolForm, handler_contact: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Supervisor</label>
                    <input type="text" className="form-control" placeholder="Supervisor name"
                      value={toolForm.handler_supervisor} onChange={e => setToolForm({ ...toolForm, handler_supervisor: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Issue Date</label>
                    <input type="date" className="form-control" required value={toolForm.issue_date} onChange={e => setToolForm({ ...toolForm, issue_date: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Acknowledgement Copy (Link / Upload)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-control" placeholder="Link or uploaded path" style={{ flex: 1 }}
                        value={toolForm.acknowledgement_copy} onChange={e => setToolForm({ ...toolForm, acknowledgement_copy: e.target.value })} />
                      <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: '4px 10px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {uploading ? '⌛ Uploading...' : '📤 Upload'}
                        <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={(e) => handleFileUpload(e, 'acknowledgement_copy')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>Notes / Remarks</label>
              <textarea className="form-control" rows="2" value={toolForm.notes} onChange={e => setToolForm({ ...toolForm, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Register Machine Modal */}
      {activeForm === 'add_machine' && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '540px' }} onSubmit={(e) => { e.preventDefault(); handleAction('add_machine', machineForm); }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">⚙️ Register Workshop Machine</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Add a new machine to the workshop inventory</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Machine Name</label>
              <input type="text" className="form-control" required placeholder="E.g. Altendorf Panel Saw F45"
                value={machineForm.name} onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Make / Brand</label>
                <input type="text" className="form-control" required placeholder="E.g. Altendorf, Homag"
                  value={machineForm.make_brand} onChange={e => setMachineForm({ ...machineForm, make_brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Purchase Year</label>
                <input type="number" className="form-control" required placeholder="2025"
                  value={machineForm.purchase_year} onChange={e => setMachineForm({ ...machineForm, purchase_year: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Service Contact Number</label>
                <input type="text" className="form-control" required placeholder="+91 9988776655"
                  value={machineForm.service_contact} onChange={e => setMachineForm({ ...machineForm, service_contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Next Service Due</label>
                <input type="date" className="form-control"
                  value={machineForm.next_service_due} onChange={e => setMachineForm({ ...machineForm, next_service_due: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Notes / Bay Location</label>
              <textarea className="form-control" rows="2" placeholder="E.g. Wood bays panel divider section"
                value={machineForm.notes} onChange={e => setMachineForm({ ...machineForm, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Machine</button>
            </div>
          </form>
        </div>
      )}

      {/* 9. Edit Machine Modal */}
      {activeForm === 'edit_machine' && selectedItem && (
        <div className="modal-backdrop">
          <form className="modal-content" style={{ maxWidth: '540px' }} onSubmit={(e) => { e.preventDefault(); handleAction('update_machine', machineForm); }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Machine: {selectedItem.name}</h3>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Machine Name</label>
              <input type="text" className="form-control" required value={machineForm.name} onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Make / Brand</label>
                <input type="text" className="form-control" required value={machineForm.make_brand} onChange={e => setMachineForm({ ...machineForm, make_brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Purchase Year</label>
                <input type="number" className="form-control" required value={machineForm.purchase_year} onChange={e => setMachineForm({ ...machineForm, purchase_year: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Service Contact</label>
                <input type="text" className="form-control" required value={machineForm.service_contact} onChange={e => setMachineForm({ ...machineForm, service_contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Next Service Due</label>
                <input type="date" className="form-control" required value={machineForm.next_service_due} onChange={e => setMachineForm({ ...machineForm, next_service_due: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Operation Status</label>
              <select className="form-control" value={machineForm.status} onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}>
                <option value="available">Available</option>
                <option value="in_service">In Service</option>
                <option value="out_of_order">Out of Order</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes / Location</label>
              <textarea className="form-control" rows="2" value={machineForm.notes} onChange={e => setMachineForm({ ...machineForm, notes: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* 10. Record Machine Service Modal */}
      {activeForm === 'service_machine' && selectedItem && (
        <div className="modal-backdrop">
          <form className="modal-content" onSubmit={(e) => { e.preventDefault(); handleAction('add_machine_service', { id: selectedItem._id, ...serviceForm }); }}>
            <div className="modal-header">
              <h3 className="modal-title">🔧 Record Maintenance: {selectedItem.name}</h3>
              <button type="button" className="modal-close" onClick={() => setActiveForm(null)}>×</button>
            </div>

            <div className="form-group">
              <label>Service Expense Cost (₹)</label>
              <input type="number" className="form-control" required placeholder="8500"
                value={serviceForm.expenses} onChange={e => setServiceForm({ ...serviceForm, expenses: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Description of Maintenance</label>
              <textarea className="form-control" required rows="3" placeholder="E.g. Replaced circular saw blades, motor lubrication"
                value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Next Service Due Date</label>
                <input type="date" className="form-control" required value={serviceForm.next_service_due} onChange={e => setServiceForm({ ...serviceForm, next_service_due: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Machine Status Post-Service</label>
                <select className="form-control" value={serviceForm.status} onChange={e => setServiceForm({ ...serviceForm, status: e.target.value })}>
                  <option value="available">Available (Ready)</option>
                  <option value="in_service">Still In Service</option>
                  <option value="out_of_order">Out of Order</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Maintenance</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
