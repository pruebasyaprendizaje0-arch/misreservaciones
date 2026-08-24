'use client';

import { useState, useEffect, useMemo } from 'react';
import { Odontogram, ToothData } from '@/components/dashboard/Odontogram';
import { ClinicalHistory, ConsultationRecord } from '@/components/dashboard/ClinicalHistory';

type Payment = {
  amountCents: number;
  status: string;
};

type Reservation = {
  id: string;
  startsAt: string;
  status: string;
  service: { name: string; priceCents?: number };
  staff: { name: string } | null;
  payments?: Payment[];
};

type InteractionLog = {
  id: string;
  date: string;
  type: 'note' | 'call' | 'whatsapp' | 'complaint' | 'stay';
  note: string;
  author: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  medicalData: any;
  metadata?: any;
  createdAt?: string;
  reservations: Reservation[];
};

type ParsedCustomerRow = {
  name: string;
  email?: string;
  phone?: string;
  docId?: string;
  notes?: string;
  tags?: string[];
  nationality?: string;
  city?: string;
  address?: string;
  isValid: boolean;
  validationError?: string;
};

type Props = {
  slug: string;
  initialCustomers: Customer[];
  industry: string;
  plan?: string;
};

const AVAILABLE_TAGS = [
  { name: 'VIP', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' },
  { name: 'Frecuente', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300' },
  { name: 'Corporativo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' },
  { name: 'Turista', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300' },
  { name: 'Primera Vez', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300' },
  { name: 'Lista Negra', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300' },
];

export function CustomerDirectory({ slug, initialCustomers, industry, plan = 'FREE' }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCustomers.length > 0 ? initialCustomers[0].id : null
  );

  // Filters & Search
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active Tab in Detail Panel
  const [activeTab, setActiveTab] = useState<'general' | 'industry' | 'timeline' | 'history'>('general');

  // Create Customer Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    docId: '',
    nationality: '',
    emergencyContact: '',
    notes: '',
    tags: [] as string[],
  });

  // Import Contact Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ParsedCustomerRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessBanner, setImportSuccessBanner] = useState<string | null>(null);

  // Edit / Form state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // General fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [docId, setDocId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [tags, setTags] = useState<string[]>([]);
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Industry Specific: Hostal
  const [nationality, setNationality] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [roomPreferences, setRoomPreferences] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // Industry Specific: Medico & Odontologia
  const [medicalSubTab, setMedicalSubTab] = useState<'clinical' | 'odontogram'>('clinical');
  const [allergies, setAllergies] = useState('');
  const [antecedents, setAntecedents] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [odontogramaData, setOdontogramaData] = useState<ToothData[]>([]);
  const [clinicalConsultations, setClinicalConsultations] = useState<ConsultationRecord[]>([]);

  // Industry Specific: Masaje
  const [preferredPressure, setPreferredPressure] = useState('Media');
  const [painAreas, setPainAreas] = useState('');
  const [oilAllergies, setOilAllergies] = useState('');
  const [wellnessPreferences, setWellnessPreferences] = useState('');

  // Industry Specific: Peluqueria / Estetica
  const [hairType, setHairType] = useState('');
  const [colorFormula, setColorFormula] = useState('');
  const [preferredStylist, setPreferredStylist] = useState('');

  // Interaction Timeline state
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogType, setNewLogType] = useState<'note' | 'call' | 'whatsapp' | 'complaint'>('note');
  const [addingLog, setAddingLog] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null;
  const isHostal = industry === 'HOSTAL';
  const isMedico = industry === 'MEDICO';
  const isMasaje = industry === 'MASAJE';
  const isPeluqueria = industry === 'PELUQUERIA';

  // Compute stats across all customers
  const stats = useMemo(() => {
    let totalSpentCents = 0;
    let vipCount = 0;
    let totalCompletedVisits = 0;

    customers.forEach((c) => {
      const meta = c.metadata || {};
      if (Array.isArray(meta.tags) && meta.tags.includes('VIP')) {
        vipCount++;
      }

      c.reservations.forEach((r) => {
        if (r.status === 'COMPLETED' || r.status === 'CONFIRMED' || r.status === 'CHECKED_IN') {
          totalCompletedVisits++;
          const paidPayment = r.payments?.find((p) => p.status === 'PAID');
          if (paidPayment) {
            totalSpentCents += paidPayment.amountCents;
          } else if (r.service?.priceCents) {
            totalSpentCents += r.service.priceCents;
          }
        }
      });
    });

    const totalSpentUSD = totalSpentCents / 100;
    const avgTicket = totalCompletedVisits > 0 ? totalSpentUSD / totalCompletedVisits : 0;

    return {
      totalCustomers: customers.length,
      vipCount,
      totalSpentUSD,
      avgTicket,
    };
  }, [customers]);

  // Sync state when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setName(selectedCustomer.name);
      setEmail(selectedCustomer.email ?? '');
      setPhone(selectedCustomer.phone ?? '');
      setNotes(selectedCustomer.notes ?? '');

      const meta = selectedCustomer.metadata || {};
      setDocId(meta.docId ?? '');
      setStatus(meta.status ?? 'ACTIVE');
      setTags(Array.isArray(meta.tags) ? meta.tags : []);
      setBirthday(meta.birthday ?? '');
      setAddress(meta.address ?? '');
      setCity(meta.city ?? '');

      // Hostal metadata
      setNationality(meta.nationality ?? '');
      setEmergencyContact(meta.emergencyContact ?? '');
      setRoomPreferences(meta.roomPreferences ?? '');
      setVehiclePlate(meta.vehiclePlate ?? '');

      // Peluqueria metadata
      setHairType(meta.hairType ?? '');
      setColorFormula(meta.colorFormula ?? '');
      setPreferredStylist(meta.preferredStylist ?? '');

      // Medical & Wellness data
      const med = selectedCustomer.medicalData || {};
      setAllergies(med.allergies ?? '');
      setAntecedents(med.antecedents ?? '');
      setBloodPressure(med.bloodPressure ?? '');
      setBloodType(med.bloodType ?? '');
      setChronicConditions(med.chronicConditions ?? '');
      setCurrentMedications(med.currentMedications ?? '');
      setDiagnosis(med.diagnosis ?? '');
      setConsultationNotes(med.consultationNotes ?? '');
      setOdontogramaData(Array.isArray(med.odontograma) ? med.odontograma : []);
      setClinicalConsultations(Array.isArray(med.consultations) ? med.consultations : []);

      setPreferredPressure(med.preferredPressure ?? 'Media');
      setPainAreas(med.painAreas ?? '');
      setOilAllergies(med.oilAllergies ?? '');
      setWellnessPreferences(med.wellnessPreferences ?? '');

      setSaveSuccess(false);
      setError(null);
      setDeleteConfirm(false);
    }
  }, [selectedId, selectedCustomer]);

  // Helper to compute customer's LTV
  function getCustomerLTV(customer: Customer) {
    let cents = 0;
    customer.reservations.forEach((r) => {
      if (r.status === 'COMPLETED' || r.status === 'CONFIRMED' || r.status === 'CHECKED_IN') {
        const paidPayment = r.payments?.find((p) => p.status === 'PAID');
        if (paidPayment) {
          cents += paidPayment.amountCents;
        } else if (r.service?.priceCents) {
          cents += r.service.priceCents;
        }
      }
    });
    return cents / 100;
  }

  // Filtered customers list
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const meta = c.metadata || {};
    const cTags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
    const cStatus: string = meta.status || 'ACTIVE';

    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (meta.docId && meta.docId.toLowerCase().includes(q)) ||
      (meta.nationality && meta.nationality.toLowerCase().includes(q));

    const matchesTag = tagFilter === 'ALL' || cTags.includes(tagFilter);
    const matchesStatus = statusFilter === 'ALL' || cStatus === statusFilter;

    return matchesSearch && matchesTag && matchesStatus;
  });

  const term = {
    customer: isHostal ? 'Huésped' : isMedico ? 'Paciente' : 'Cliente',
    customers: isHostal ? 'Huéspedes' : isMedico ? 'Pacientes' : 'Clientes',
    bookings: isHostal ? 'Estadías' : isMedico ? 'Consultas' : 'Reservas',
    staff: isHostal ? 'Personal' : isMedico ? 'Médico' : 'Atendido por',
  };

  // Create new customer handler
  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/tenants/${slug}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          phone: createForm.phone || null,
          email: createForm.email || null,
          notes: createForm.notes || null,
          metadata: {
            docId: createForm.docId || null,
            nationality: createForm.nationality || null,
            emergencyContact: createForm.emergencyContact || null,
            status: 'ACTIVE',
            tags: createForm.tags,
            interactionLogs: [
              {
                id: `log_${Date.now()}`,
                date: new Date().toISOString(),
                type: 'stay',
                note: `Cliente registrado en la plataforma.`,
                author: 'Sistema',
              },
            ],
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCustomer: Customer = {
          ...data.customer,
          reservations: [],
        };
        setCustomers((prev) => [newCustomer, ...prev]);
        setSelectedId(newCustomer.id);
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          phone: '',
          email: '',
          docId: '',
          nationality: '',
          emergencyContact: '',
          notes: '',
          tags: [],
        });
      }
    } catch (err) {
      console.error('Error al crear cliente:', err);
    } finally {
      setCreating(false);
    }
  }

  // Save changes handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    let medicalDataValue: any = null;
    if (isMedico) {
      medicalDataValue = {
        allergies,
        antecedents,
        bloodPressure,
        bloodType,
        chronicConditions,
        currentMedications,
        diagnosis,
        consultationNotes,
        odontograma: odontogramaData,
        consultations: clinicalConsultations,
      };
    } else if (isMasaje) {
      medicalDataValue = {
        preferredPressure,
        painAreas,
        oilAllergies,
        wellnessPreferences,
      };
    }

    const currentMeta = selectedCustomer?.metadata || {};
    const metadataValue = {
      ...currentMeta,
      docId: docId || null,
      status,
      tags,
      birthday: birthday || null,
      address: address || null,
      city: city || null,
      nationality: nationality || null,
      emergencyContact: emergencyContact || null,
      roomPreferences: roomPreferences || null,
      vehiclePlate: vehiclePlate || null,
      hairType: hairType || null,
      colorFormula: colorFormula || null,
      preferredStylist: preferredStylist || null,
    };

    try {
      const res = await fetch(`/api/tenants/${slug}/customers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          medicalData: medicalDataValue,
          metadata: metadataValue,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar la ficha');

      const data = await res.json();
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ...data.customer } : c))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  // Delete customer handler
  async function handleDeleteCustomer() {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/tenants/${slug}/customers?id=${selectedId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = customers.filter((c) => c.id !== selectedId);
        setCustomers(remaining);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        setDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
    }
  }

  // Add timeline note handler
  async function handleAddInteractionNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !newLogNote.trim()) return;

    setAddingLog(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/customers/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedId,
          type: newLogType,
          note: newLogNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomers((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, ...data.customer } : c))
        );
        setNewLogNote('');
      }
    } catch (err) {
      console.error('Error al agregar nota de interacción:', err);
    } finally {
      setAddingLog(false);
    }
  }

  // Toggle tag selection
  function toggleTag(tagName: string) {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }

  // Interaction logs from metadata
  const interactionLogs: InteractionLog[] = useMemo(() => {
    if (!selectedCustomer?.metadata?.interactionLogs) return [];
    return selectedCustomer.metadata.interactionLogs;
  }, [selectedCustomer]);

  // CSV Import Parser
  function parseCSVContent(text: string): ParsedCustomerRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const sep = firstLine.includes(';') && !firstLine.includes(',') ? ';' : firstLine.includes('\t') ? '\t' : ',';

    function splitLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === sep && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const rawHeaders = splitLine(lines[0]);
    const headers = rawHeaders.map(norm);

    const hasNameHeader = headers.some((h) =>
      ['nombre', 'name', 'cliente', 'huesped', 'paciente', 'contacto', 'fullname'].includes(h)
    );

    let nameIdx = -1;
    let phoneIdx = -1;
    let emailIdx = -1;
    let docIdIdx = -1;
    let notesIdx = -1;
    let tagsIdx = -1;
    let nationalityIdx = -1;
    let cityIdx = -1;
    let addressIdx = -1;

    let startRow = 0;

    if (hasNameHeader) {
      startRow = 1;
      headers.forEach((h, idx) => {
        if (['nombre', 'name', 'cliente', 'huesped', 'paciente', 'contacto', 'fullname'].includes(h)) nameIdx = idx;
        else if (['telefono', 'phone', 'celular', 'mobile', 'whatsapp', 'tel'].includes(h)) phoneIdx = idx;
        else if (['email', 'correo', 'mail', 'correoelectronico'].includes(h)) emailIdx = idx;
        else if (['cedula', 'dni', 'documento', 'id', 'ruc', 'identificacion', 'docid'].includes(h)) docIdIdx = idx;
        else if (['notas', 'notes', 'observacion', 'observaciones', 'comentario', 'comentarios'].includes(h)) notesIdx = idx;
        else if (['etiquetas', 'tags', 'categoria', 'clasificacion'].includes(h)) tagsIdx = idx;
        else if (['nacionalidad', 'nationality', 'pais', 'country'].includes(h)) nationalityIdx = idx;
        else if (['ciudad', 'city'].includes(h)) cityIdx = idx;
        else if (['direccion', 'address'].includes(h)) addressIdx = idx;
      });
    } else {
      nameIdx = 0;
      phoneIdx = 1;
      emailIdx = 2;
      docIdIdx = 3;
      notesIdx = 4;
      tagsIdx = 5;
      nationalityIdx = 6;
      cityIdx = 7;
    }

    const parsedRows: ParsedCustomerRow[] = [];

    for (let i = startRow; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.every((c) => c === '')) continue;

      const rawName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : cols[0] || '';
      const name = rawName.replace(/^["']|["']$/g, '').trim();

      if (!name) {
        parsedRows.push({
          name: 'Sin nombre',
          isValid: false,
          validationError: 'Nombre requerido',
        });
        continue;
      }

      const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const phone = phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const docId = docIdIdx >= 0 && cols[docIdIdx] ? cols[docIdIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const rawTags = tagsIdx >= 0 && cols[tagsIdx] ? cols[tagsIdx].replace(/^["']|["']$/g, '').trim() : '';
      const tags = rawTags ? rawTags.split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [];
      const nationality = nationalityIdx >= 0 && cols[nationalityIdx] ? cols[nationalityIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const city = cityIdx >= 0 && cols[cityIdx] ? cols[cityIdx].replace(/^["']|["']$/g, '').trim() : undefined;
      const address = addressIdx >= 0 && cols[addressIdx] ? cols[addressIdx].replace(/^["']|["']$/g, '').trim() : undefined;

      parsedRows.push({
        name,
        email: email || undefined,
        phone: phone || undefined,
        docId: docId || undefined,
        notes: notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        nationality: nationality || undefined,
        city: city || undefined,
        address: address || undefined,
        isValid: true,
      });
    }

    return parsedRows;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportError('El archivo está vacío.');
        return;
      }
      const rows = parseCSVContent(content);
      if (rows.length === 0) {
        setImportError('No se encontraron filas de contactos para importar.');
      } else {
        setImportRows(rows);
      }
    };
    reader.onerror = () => {
      setImportError('Error al leer el archivo.');
    };
    reader.readAsText(file);
  }

  function handleDownloadCSVTemplate() {
    const content =
      '\uFEFF' +
      [
        'Nombre,Telefono,Email,Cedula,Notas,Etiquetas,Nacionalidad,Ciudad',
        'Carlos Mendoza,+593991234567,carlos.mendoza@ejemplo.com,1712345678,Contacto corporativo VIP,VIP;Frecuente,Ecuatoriana,Quito',
        'Maria Fernanda Gomez,+593987654321,maria.gomez@ejemplo.com,0923456789,Cliente registrado en sitio web,Primera Vez,Ecuatoriana,Guayaquil',
        'Juan Jose Ramirez,+593995554444,juan.ramirez@ejemplo.com,1104567890,Estadía agendada,Turista,Colombiana,Cuenca',
      ].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla-importacion-${term.customers.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleConfirmImport() {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError('No hay contactos válidos para importar.');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch(`/api/tenants/${slug}/customers/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers: validRows.map((r) => ({
            name: r.name,
            email: r.email || null,
            phone: r.phone || null,
            docId: r.docId || null,
            notes: r.notes || null,
            tags: r.tags || [],
            nationality: r.nationality || null,
            city: r.city || null,
            address: r.address || null,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al importar los contactos.');
      }

      const data = await res.json();
      if (data.customers && data.customers.length > 0) {
        setCustomers((prev) => [...data.customers, ...prev]);
        setSelectedId(data.customers[0].id);
      }

      setShowImportModal(false);
      setImportFileName(null);
      setImportRows([]);
      setImportSuccessBanner(`🎉 ¡Excelente! Se importaron ${data.count} ${term.customers.toLowerCase()} exitosamente al CRM.`);
      setTimeout(() => setImportSuccessBanner(null), 6000);
    } catch (err: any) {
      setImportError(err.message || 'Ocurrió un error inesperado al importar.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Import Success Banner */}
      {importSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <span>{importSuccessBanner}</span>
          <button
            type="button"
            onClick={() => setImportSuccessBanner(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}
      {/* CRM Executive Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total {term.customers}</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
            ⭐
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{term.customers} VIP</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.vipCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ingresos LTV Total</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${stats.totalSpentUSD.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl font-bold">
            📊
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gasto Promedio</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              ${stats.avgTicket.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Main CRM Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Panel: Filters & Customer Directory */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[78vh]">
          {/* Action Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 text-xs transition shadow-sm"
              >
                <span>👤+</span> Registrar {term.customer}
              </button>
              {plan === 'FREE' ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        '🔒 La importación masiva de contactos a Excel / CSV está disponible únicamente en el Plan PRO ($10/m) y Plan BUSINESS ($15/m). ¡Actualiza tu suscripción en el panel principal!'
                      )
                    }
                    className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                    title="Importar contactos (PRO)"
                  >
                    🔒 Importar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        '🔒 La exportación a Excel / CSV está disponible únicamente en el Plan PRO ($10/m) y Plan BUSINESS ($15/m). ¡Actualiza tu suscripción en el panel principal!'
                      )
                    }
                    className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                    title="Exportar a CSV (PRO)"
                  >
                    🔒 Exportar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setImportFileName(null);
                      setImportRows([]);
                      setImportError(null);
                      setShowImportModal(true);
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Importar contactos desde CSV"
                  >
                    📤 Importar
                  </button>
                  <a
                    href={`/api/tenants/${slug}/customers/export`}
                    download
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Exportar a CSV"
                  >
                    📥 Exportar
                  </a>
                </>
              )}
            </div>

            {/* Search Input */}
            <input
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              type="search"
              placeholder={`Buscar por nombre, cédula o teléfono...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Filters bar */}
            <div className="flex gap-2 text-xs">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">🏷️ Todas las Etiquetas</option>
                {AVAILABLE_TAGS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">📌 Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
                <option value="BLOCKED">Lista Negra ⛔</option>
              </select>
            </div>
          </div>

          {/* Directory Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                No se encontraron {term.customers.toLowerCase()} con esos criterios.
              </div>
            ) : (
              filtered.map((c) => {
                const meta = c.metadata || {};
                const cTags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
                const cStatus = meta.status || 'ACTIVE';
                const ltv = getCustomerLTV(c);

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col gap-1.5 ${
                      selectedId === c.id
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-200 uppercase">
                          {c.name.substring(0, 2)}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-tight">
                          {c.name}
                        </h4>
                      </div>

                      {cStatus === 'BLOCKED' ? (
                        <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded">
                          ⛔ Bloqueado
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ${ltv.toFixed(0)} LTV
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {meta.docId ? `🆔 ${meta.docId} · ` : ''}
                        {c.phone || c.email || 'Sin contacto'}
                      </span>
                      <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {c.reservations.length} {isHostal ? 'est.' : 'res.'}
                      </span>
                    </div>

                    {cTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {cTags.map((t) => {
                          const conf = AVAILABLE_TAGS.find((at) => at.name === t);
                          return (
                            <span
                              key={t}
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                conf ? conf.color : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                              }`}
                            >
                              {t}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Ficha 360° del Cliente */}
        <div className="md:col-span-2 space-y-6">
          {selectedCustomer ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              {/* Header Profile Summary */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                      {selectedCustomer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                          {selectedCustomer.name}
                        </h3>
                        {status === 'BLOCKED' && (
                          <span className="text-xs font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded shadow-sm">
                            ⛔ Lista Negra
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>🆔 {docId || 'Sin Cédula/DNI'}</span>
                        <span>•</span>
                        <span>📞 {phone || 'Sin Teléfono'}</span>
                        <span>•</span>
                        <span>✉️ {email || 'Sin Email'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Direct Action Buttons: WhatsApp, Mail, Save */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {phone && (
                      <a
                        href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hola ${selectedCustomer.name}, te saludamos de parte de nuestro negocio.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                        title="Enviar WhatsApp"
                      >
                        💬 WhatsApp
                      </a>
                    )}

                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        ✉️ Email
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : '💾 Guardar Ficha'}
                    </button>
                  </div>
                </div>

                {/* Notifications & Feedback */}
                {saveSuccess && (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    ✅ Cambios guardados correctamente en la ficha del {term.customer.toLowerCase()}.
                  </div>
                )}
                {error && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold">
                    ⚠ {error}
                  </div>
                )}

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pt-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`pb-2.5 px-3 transition border-b-2 ${
                      activeTab === 'general'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    👤 Contacto y Datos Generales
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('industry')}
                    className={`pb-2.5 px-3 transition border-b-2 ${
                      activeTab === 'industry'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    {isHostal
                      ? '🏨 Registro de Alojamiento'
                      : isMedico
                      ? '🏥 Historia Clínica'
                      : isMasaje
                      ? '💆 Preferencias de Spa/Masaje'
                      : '💇 Preferencias de Servicio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`pb-2.5 px-3 transition border-b-2 flex items-center gap-1 ${
                      activeTab === 'timeline'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <span>⏱️ Bitácora y Notas</span>
                    {interactionLogs.length > 0 && (
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full px-1.5 py-0.2 text-[10px]">
                        {interactionLogs.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`pb-2.5 px-3 transition border-b-2 flex items-center gap-1 ${
                      activeTab === 'history'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <span>📅 Historial de {term.bookings}</span>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full px-1.5 py-0.2 text-[10px]">
                      {selectedCustomer.reservations.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tab Content Body */}
              <div className="p-6 space-y-6">
                {/* TAB 1: GENERAL & CONTACT */}
                {activeTab === 'general' && (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Nombre completo *
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Teléfono / WhatsApp
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. +593 99 123 4567"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Correo electrónico
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="cliente@ejemplo.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Cédula / Pasaporte / DNI
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={docId}
                          onChange={(e) => setDocId(e.target.value)}
                          placeholder="Ej. 0912345678"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Estado en CRM
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="ACTIVE">🟢 Activo / Normal</option>
                          <option value="INACTIVE">⚪ Inactivo</option>
                          <option value="BLOCKED">⛔ Lista Negra / Bloqueado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Fecha de Nacimiento / Cumpleaños
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={birthday}
                          onChange={(e) => setBirthday(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Dirección de Domicilio
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Calle Principal #123..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Ciudad / País
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Quito, Ecuador"
                        />
                      </div>
                    </div>

                    {/* Tag Manager */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        🏷️ Etiquetas de Clasificación
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map((t) => {
                          const isSelected = tags.includes(t.name);
                          return (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => toggleTag(t.name)}
                              className={`text-xs font-bold px-3 py-1 rounded-full border transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 hover:border-indigo-400'
                              }`}
                            >
                              {isSelected ? `✓ ${t.name}` : `+ ${t.name}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special Notes */}
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Observaciones especiales y preferencias de atención
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium min-h-[90px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Solicitó factura corporativa a nombre de Empresa S.A., prefiere atención por las mañanas..."
                      />
                    </div>

                    {/* Danger zone delete */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      {deleteConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500 font-bold">¿Eliminar permanentemente?</span>
                          <button
                            type="button"
                            onClick={handleDeleteCustomer}
                            className="px-3 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                          >
                            Sí, Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(true)}
                          className="text-xs text-red-500 hover:text-red-400 font-bold hover:underline"
                        >
                          🗑️ Eliminar Ficha del {term.customer}
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* TAB 2: INDUSTRY SPECIFIC FICHA */}
                {activeTab === 'industry' && (
                  <form onSubmit={handleSave} className="space-y-6">
                    {/* HOSTAL Specific Ficha */}
                    {isHostal && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                          🏨 Ficha de Alojamiento y Registro de Registro de Huéspedes
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Nacionalidad / País de Origen
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={nationality}
                              onChange={(e) => setNationality(e.target.value)}
                              placeholder="Ej. Ecuador / Guayaquil, Argentina..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Contacto de Emergencia
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={emergencyContact}
                              onChange={(e) => setEmergencyContact(e.target.value)}
                              placeholder="Ej. María Pérez (Familiar) +593 99..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Preferencias de Habitación
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={roomPreferences}
                              onChange={(e) => setRoomPreferences(e.target.value)}
                              placeholder="Ej. Piso alto, silenciosa, cama matrimonial..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Placa Vehicular / Transporte
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={vehiclePlate}
                              onChange={(e) => setVehiclePlate(e.target.value)}
                              placeholder="Ej. GBA-1234"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MEDICO & ODONTOLOGIA Specific Ficha */}
                    {isMedico && (
                      <div className="space-y-6">
                        {/* Sub-tab navigation bar for Medical & Dental */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1">
                          <button
                            type="button"
                            onClick={() => setMedicalSubTab('clinical')}
                            className={`pb-2 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 ${
                              medicalSubTab === 'clinical'
                                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            <span>📋</span> Historia Clínica & Consultas (SOAP)
                          </button>
                          <button
                            type="button"
                            onClick={() => setMedicalSubTab('odontogram')}
                            className={`pb-2 px-4 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 ${
                              medicalSubTab === 'odontogram'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            <span>🦷</span> Odontograma Interactivo (FDI)
                          </button>
                        </div>

                        {/* Sub-tab 1: Clinical History & SOAP */}
                        {medicalSubTab === 'clinical' && (
                          <ClinicalHistory
                            allergies={allergies}
                            setAllergies={setAllergies}
                            bloodType={bloodType}
                            setBloodType={setBloodType}
                            bloodPressure={bloodPressure}
                            setBloodPressure={setBloodPressure}
                            currentMedications={currentMedications}
                            setCurrentMedications={setCurrentMedications}
                            antecedents={antecedents}
                            setAntecedents={setAntecedents}
                            diagnosis={diagnosis}
                            setDiagnosis={setDiagnosis}
                            consultations={clinicalConsultations}
                            onAddConsultation={(rec) => setClinicalConsultations((prev) => [rec, ...prev])}
                          />
                        )}

                        {/* Sub-tab 2: Odontogram */}
                        {medicalSubTab === 'odontogram' && (
                          <Odontogram
                            initialData={odontogramaData}
                            onChange={(teeth) => setOdontogramaData(teeth)}
                          />
                        )}
                      </div>
                    )}

                    {/* MASAJE Specific Ficha */}
                    {isMasaje && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                          💆 Ficha de Bienestar & Preferencias de Spa
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Presión de Masaje Preferida
                            </label>
                            <select
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={preferredPressure}
                              onChange={(e) => setPreferredPressure(e.target.value)}
                            >
                              <option value="Suave">Suave / Relajante</option>
                              <option value="Media">Media / Moderada</option>
                              <option value="Fuerte">Fuerte / Tejido Profundo (Deep Tissue)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Alergias a Aceites o Esencias
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={oilAllergies}
                              onChange={(e) => setOilAllergies(e.target.value)}
                              placeholder="Ej. Lavanda, almendras..."
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Zonas de Mayor Dolor o Tensión Muscular
                          </label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs min-h-[70px]"
                            value={painAreas}
                            onChange={(e) => setPainAreas(e.target.value)}
                            placeholder="Ej. Cuello, hombros, zona lumbar..."
                          />
                        </div>
                      </div>
                    )}

                    {/* PELUQUERIA Specific Ficha */}
                    {isPeluqueria && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                          💇 Ficha de Estética y Fórmulas de Cabello
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Tipo de Cabello / Piel
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={hairType}
                              onChange={(e) => setHairType(e.target.value)}
                              placeholder="Ej. Crespo, fino, tinturado, cuero cabelludo graso..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Estilista Habitual Preferido
                            </label>
                            <input
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                              value={preferredStylist}
                              onChange={(e) => setPreferredStylist(e.target.value)}
                              placeholder="Ej. Ana María"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Fórmula de Tinte / Tratamientos Aplicados
                          </label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs min-h-[70px]"
                            value={colorFormula}
                            onChange={(e) => setColorFormula(e.target.value)}
                            placeholder="Ej. Tinte 7.1 + 20 vol, matizador ceniza..."
                          />
                        </div>
                      </div>
                    )}

                    {!isHostal && !isMedico && !isMasaje && !isPeluqueria && (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        Esta industria utiliza la ficha de datos generales y observaciones.
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                      >
                        {saving ? 'Guardando...' : '💾 Guardar Ficha Específica'}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 3: TIMELINE & INTERACTION LOGS */}
                {activeTab === 'timeline' && (
                  <div className="space-y-6">
                    {/* Add Interaction Log Form */}
                    <form onSubmit={handleAddInteractionNote} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>✍️</span> Registrar Nueva Nota / Interacción
                      </h4>
                      <div className="flex gap-2">
                        <select
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold"
                          value={newLogType}
                          onChange={(e) => setNewLogType(e.target.value as any)}
                        >
                          <option value="note">📝 Nota Interna</option>
                          <option value="call">📞 Llamada</option>
                          <option value="whatsapp">💬 WhatsApp</option>
                          <option value="complaint">⚠️ Incidencia / Queja</option>
                        </select>
                        <input
                          type="text"
                          required
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs"
                          placeholder="Escribe el detalle de la interacción..."
                          value={newLogNote}
                          onChange={(e) => setNewLogNote(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={addingLog || !newLogNote.trim()}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
                        >
                          {addingLog ? 'Guardando...' : 'Añadir'}
                        </button>
                      </div>
                    </form>

                    {/* Timeline Feed */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Historial Cronológico de Interacciones
                      </h4>
                      {interactionLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">
                          No hay interacciones registradas aún. Registra una con el formulario superior.
                        </p>
                      ) : (
                        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                          {interactionLogs.map((log) => (
                            <div key={log.id} className="relative flex items-start gap-3 pl-8">
                              <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">
                                {log.type === 'call'
                                  ? '📞'
                                  : log.type === 'whatsapp'
                                  ? '💬'
                                  : log.type === 'complaint'
                                  ? '⚠️'
                                  : '📝'}
                              </div>

                              <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm text-xs space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {log.author}
                                  </span>
                                  <span>
                                    {new Date(log.date).toLocaleString('es-EC', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200">{log.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: RESERVATION & STATISTICAL HISTORY */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    {/* Financial Summary Card for this customer */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total {term.bookings}</p>
                        <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          {selectedCustomer.reservations.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Completadas</p>
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          {
                            selectedCustomer.reservations.filter(
                              (r) => r.status === 'COMPLETED' || r.status === 'CONFIRMED'
                            ).length
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Gastado (LTV)</p>
                        <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                          ${getCustomerLTV(selectedCustomer).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Reservations Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          📅 Listado de {term.bookings} Realizadas
                        </h4>
                        <a
                          href={`/${slug}/reservar`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          ➕ Nueva Reserva para {selectedCustomer.name} →
                        </a>
                      </div>

                      {selectedCustomer.reservations.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">
                          Este {term.customer.toLowerCase()} no registra {term.bookings.toLowerCase()} realizadas.
                        </p>
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Fecha</th>
                                <th className="px-4 py-2.5">Servicio</th>
                                <th className="px-4 py-2.5">{term.staff}</th>
                                <th className="px-4 py-2.5">Precio</th>
                                <th className="px-4 py-2.5">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                              {selectedCustomer.reservations.map((r) => {
                                const priceUSD = (r.service?.priceCents ?? 0) / 100;
                                return (
                                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    <td className="px-4 py-3 font-medium">
                                      {new Date(r.startsAt).toLocaleString('es-EC', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })}
                                    </td>
                                    <td className="px-4 py-3 font-bold">{r.service.name}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                      {r.staff?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                                      ${priceUSD.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                          r.status === 'CONFIRMED'
                                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                            : r.status === 'COMPLETED'
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                            : r.status === 'PENDING'
                                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                            : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                        }`}
                                      >
                                        {r.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-400 dark:text-slate-500 italic">
              Selecciona un {term.customer.toLowerCase()} del panel izquierdo para ver su ficha 360° o crea uno nuevo con el botón superior.
            </div>
          )}
        </div>
      </div>

      {/* Modal para Registrar Nuevo Huésped / Cliente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤+</span> Registrar Nuevo {term.customer} en CRM
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cédula / Pasaporte / DNI</label>
                  <input
                    type="text"
                    placeholder="Ej. 0912345678"
                    value={createForm.docId}
                    onChange={(e) => setCreateForm({ ...createForm, docId: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. +593 99..."
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="juan@ejemplo.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nacionalidad / Origen</label>
                  <input
                    type="text"
                    placeholder="Ej. Ecuador / Guayaquil"
                    value={createForm.nationality}
                    onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas iniciales o preferencias</label>
                <textarea
                  placeholder="Observaciones de estadía, alergias, preferencias..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white min-h-[70px] resize-y"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
                >
                  {creating ? 'Registrando…' : `💾 Registrar ${term.customer}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Customers Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📤</span> Importación Masiva de {term.customers} (CSV / Excel)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Carga un archivo CSV para agregar múltiples {term.customers.toLowerCase()} automáticamente a tu CRM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Template & File Upload Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div>
                  <p className="text-xs font-bold text-slate-200">¿No tienes el formato correcto?</p>
                  <p className="text-[11px] text-slate-400">
                    Descarga nuestra plantilla CSV de ejemplo con los campos compatibles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600/30 transition flex items-center gap-1.5 shrink-0"
                >
                  <span>📄</span> Descargar Plantilla CSV
                </button>
              </div>

              {/* File Input Dropzone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 text-center transition bg-slate-800/30">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  id="csv-file-input"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl">
                    📁
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">
                      {importFileName ? `Archivo: ${importFileName}` : 'Haz clic para seleccionar tu archivo CSV'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Soporta separadores por coma (,), punto y coma (;) o tabulador.</p>
                  </div>
                </label>
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <span>⚠️</span> {importError}
                </div>
              )}
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
                  <span>
                    📋 Vistas previas: {importRows.filter((r) => r.isValid).length} contactos válidos
                    {importRows.filter((r) => !r.isValid).length > 0 && (
                      <span className="text-rose-400 font-normal ml-1">
                        ({importRows.filter((r) => !r.isValid).length} incompletos/omitidos)
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400">Mostrando hasta 50 filas</span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[30vh] border border-slate-800 rounded-xl bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Nombre</th>
                        <th className="p-2.5">Teléfono</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Cédula / DNI</th>
                        <th className="p-2.5">Etiquetas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {importRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-900/50' : 'bg-rose-950/20 text-rose-300'}>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                                Válido
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                                {row.validationError || 'Inválido'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-slate-100">{row.name}</td>
                          <td className="p-2.5">{row.phone || '-'}</td>
                          <td className="p-2.5">{row.email || '-'}</td>
                          <td className="p-2.5">{row.docId || '-'}</td>
                          <td className="p-2.5">
                            {row.tags && row.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.tags.map((t, tidx) => (
                                  <span key={tidx} className="bg-slate-800 text-[9px] px-1 py-0.2 rounded border border-slate-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || importRows.filter((r) => r.isValid).length === 0}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>Importando contactos…</>
                ) : (
                  <>🚀 Confirmar e Importar ({importRows.filter((r) => r.isValid).length})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
