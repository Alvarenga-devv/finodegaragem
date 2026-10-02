/**
 * FINO DE GARAGEM — Camada de dados (demo)
 *
 * Esta camada simula um backend real usando localStorage, mas foi escrita
 * para que a MESMA interface de funções (FDG.db.*) possa ser trocada por
 * chamadas a uma API/Supabase real sem alterar o restante do front-end.
 *
 * Em produção: substituir as funções abaixo por chamadas fetch()/Supabase
 * client mantendo as mesmas assinaturas. Ver /backend/README.md.
 */
(function (global) {
  "use strict";

  const DB_KEY = "fdg_db_v1";
  const SESSION_KEY = "fdg_session_v1";

  const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  // ---------------------------------------------------------------------
  // Seed (dados fictícios de demonstração — claramente marcados como tal)
  // ---------------------------------------------------------------------
  function seed() {
    const now = new Date();
    const iso = (d) => d.toISOString();

    const businessHours = {
      1: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      2: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      3: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      4: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      5: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      6: { open: true, intervals: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }] },
      0: { open: false, intervals: [] },
    };

    const services = [
      { id: "s1", name: "Corte", price: 38, duration: 30, category: "Cabelo", description: "Corte tradicional com acabamento na máquina e tesoura.", active: true },
      { id: "s2", name: "Acabamento + Barba Express", price: 40, duration: 30, category: "Combo", description: "Acabamento do corte com barba rápida na navalha.", active: true },
      { id: "s3", name: "Acabamento + Barboterapia", price: 45, duration: 40, category: "Combo", description: "Acabamento com tratamento completo de barba.", active: true },
      { id: "s4", name: "Corte + Barba Express", price: 68, duration: 60, category: "Combo", description: "O clássico: corte completo com barba express.", active: true },
      { id: "s5", name: "Corte + Sobrancelha", price: 45, duration: 45, category: "Combo", description: "Corte completo com design de sobrancelha.", active: true },
      { id: "s6", name: "Corte + Barba Express + Sobrancelha", price: 73, duration: 70, category: "Combo", description: "Visual completo: corte, barba e sobrancelha.", active: true },
      { id: "s7", name: "Corte + Barboterapia", price: 76, duration: 75, category: "Combo", description: "Corte com tratamento premium de barba.", active: true },
      { id: "s8", name: "Corte + Barboterapia + Sobrancelha", price: null, priceLabel: "Consultar", duration: 90, category: "Combo", description: "Pacote completo premium. Valor sob consulta.", active: true },
      { id: "s9", name: "Barboterapia", price: 38, duration: 35, category: "Barba", description: "Tratamento hidratante e modelagem de barba.", active: true },
      { id: "s10", name: "Barba Express", price: 30, duration: 20, category: "Barba", description: "Barba rápida feita na navalha.", active: true },
      { id: "s11", name: "Acabamento (Pezinho)", price: 13, duration: 15, category: "Cabelo", description: "Acabamento de contorno e pezinho.", active: true },
      { id: "s12", name: "Luzes", price: 60, duration: 90, category: "Coloração", description: "Mechas e luzes personalizadas.", active: true },
      { id: "s13", name: "Penteado", price: 12, duration: 15, category: "Cabelo", description: "Finalização e penteado para ocasiões especiais.", active: true },
      { id: "s14", name: "Pintura", price: 35, duration: 50, category: "Coloração", description: "Coloração completa do cabelo.", active: true },
      { id: "s15", name: "Platinado", price: 100, duration: 120, category: "Coloração", description: "Descoloração completa estilo platinado.", active: true },
      { id: "s16", name: "Progressiva", price: 75, duration: 90, category: "Tratamento", description: "Alisamento e tratamento progressivo.", active: true },
      { id: "s17", name: "Sobrancelha", price: 13, duration: 15, category: "Acabamento", description: "Design e acabamento de sobrancelha.", active: true },
    ];

    const users = [
      { id: "u_admin", name: "Carlos Mendes", email: "admin@finodegaragem.com", phone: "5531999990001", role: "admin", passwordHash: null, createdAt: iso(now) },
      { id: "u_barber1", name: "João Silva", email: "joao@finodegaragem.com", phone: "5531999990002", role: "barber", passwordHash: null, createdAt: iso(now) },
      { id: "u_client1", name: "Pedro Alves", email: "pedro.cliente@exemplo.com", phone: "5531988880001", role: "client", passwordHash: null, createdAt: iso(now) },
      { id: "u_client2", name: "Lucas Souza", email: "lucas.cliente@exemplo.com", phone: "5531988880002", role: "client", passwordHash: null, createdAt: iso(now) },
      { id: "u_client3", name: "Rafael Costa", email: "rafael.cliente@exemplo.com", phone: "5531988880003", role: "client", passwordHash: null, createdAt: iso(now) },
    ];

    const professionals = [
      { id: "p_carlos", userId: "u_admin", displayName: "Carlos Mendes", role: "Proprietário / Barbeiro", commissionPct: 100, serviceIds: services.map((s) => s.id), active: true, avatarInitials: "CM" },
      { id: "p_joao", userId: "u_barber1", displayName: "João Silva", role: "Barbeiro", commissionPct: 40, serviceIds: services.map((s) => s.id), active: true, avatarInitials: "JS" },
    ];

    const clients = [
      { id: "c1", userId: "u_client1", notes: "Cliente fiel, prefere corte social.", favoriteServiceIds: ["s4"], preferredProfessionalId: "p_joao" },
      { id: "c2", userId: "u_client2", notes: "", favoriteServiceIds: ["s1"], preferredProfessionalId: "p_carlos" },
      { id: "c3", userId: "u_client3", notes: "Alergia a determinados produtos — confirmar antes da barboterapia.", favoriteServiceIds: ["s9"], preferredProfessionalId: "p_joao" },
    ];

    // Agendamentos fictícios de demonstração
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const appointments = [
      {
        id: "a1", clientId: "c1", professionalId: "p_joao", serviceId: "s4",
        date: fmt(today), startTime: "15:30", endTime: "16:30",
        status: "CONFIRMADO", price: 68, paymentMethod: "pix", paymentStatus: "pendente",
        createdAt: iso(now), notes: "",
      },
      {
        id: "a2", clientId: "c2", professionalId: "p_carlos", serviceId: "s1",
        date: fmt(today), startTime: "10:00", endTime: "10:30",
        status: "CONCLUIDO", price: 38, paymentMethod: "dinheiro", paymentStatus: "pago",
        createdAt: iso(new Date(now.getTime() - 86400000)), notes: "",
      },
      {
        id: "a3", clientId: "c3", professionalId: "p_joao", serviceId: "s9",
        date: fmt(new Date(now.getTime() - 86400000 * 3)), startTime: "11:00", endTime: "11:35",
        status: "CONCLUIDO", price: 38, paymentMethod: "cartao", paymentStatus: "pago",
        createdAt: iso(new Date(now.getTime() - 86400000 * 3)), notes: "",
      },
    ];

    const blockedTimes = [
      { id: "b1", professionalId: "p_carlos", date: fmt(new Date(now.getTime() + 86400000 * 2)), startTime: "13:00", endTime: "15:00", reason: "Compromisso pessoal", fullDay: false },
    ];

    const employeePayments = [];
    const notifications = [];

    const settings = {
      businessName: "Barbearia Fino de Garagem",
      address: { street: "R. Bela Petruchy", number: "215", neighborhood: "Colorado", city: "Ibirité", state: "MG", zip: "32400-000" },
      whatsapp: "5531999973676",
      rating: 4.9,
      reviewsCount: 16,
      mapsQuery: "Barbearia Fino de Garagem, R. Bela Petruchy, 215, Colorado, Ibirité - MG, 32400-000",
    };

    return { businessHours, services, users, professionals, clients, appointments, blockedTimes, employeePayments, notifications, settings, _demo: true };
  }

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Falha ao ler banco local, recriando seed.", e);
    }
    const s = seed();
    save(s);
    return s;
  }

  function save(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  let DB = load();

  function persist() {
    save(DB);
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 10);
  }

  // ---------------------------------------------------------------------
  // Helpers de tempo
  // ---------------------------------------------------------------------
  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function toHHMM(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  // ---------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------
  function getServices({ activeOnly = true } = {}) {
    return DB.services.filter((s) => (activeOnly ? s.active : true));
  }
  function getService(id) {
    return DB.services.find((s) => s.id === id) || null;
  }
  function getProfessionals({ activeOnly = true } = {}) {
    return DB.professionals.filter((p) => (activeOnly ? p.active : true));
  }
  function getProfessional(id) {
    return DB.professionals.find((p) => p.id === id) || null;
  }
  function getUser(id) {
    return DB.users.find((u) => u.id === id) || null;
  }
  function getUserByEmail(email) {
    return DB.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }
  function getClientByUserId(userId) {
    return DB.clients.find((c) => c.userId === userId) || null;
  }
  function getClient(id) {
    return DB.clients.find((c) => c.id === id) || null;
  }
  function getBusinessHours() {
    return DB.businessHours;
  }
  function setBusinessHours(hours) {
    DB.businessHours = hours;
    persist();
  }
  function getSettings() {
    return DB.settings;
  }
  function setSettings(patch) {
    DB.settings = { ...DB.settings, ...patch };
    persist();
  }

  function getBlockedTimes({ professionalId, date } = {}) {
    return DB.blockedTimes.filter(
      (b) => (!professionalId || b.professionalId === professionalId) && (!date || b.date === date)
    );
  }
  function addBlockedTime(block) {
    const b = { id: uid("b"), fullDay: false, ...block };
    DB.blockedTimes.push(b);
    persist();
    return b;
  }
  function removeBlockedTime(id) {
    DB.blockedTimes = DB.blockedTimes.filter((b) => b.id !== id);
    persist();
  }

  function getAppointments(filter = {}) {
    return DB.appointments.filter((a) => {
      if (filter.clientId && a.clientId !== filter.clientId) return false;
      if (filter.professionalId && a.professionalId !== filter.professionalId) return false;
      if (filter.date && a.date !== filter.date) return false;
      if (filter.dateFrom && a.date < filter.dateFrom) return false;
      if (filter.dateTo && a.date > filter.dateTo) return false;
      if (filter.status && a.status !== filter.status) return false;
      return true;
    });
  }
  function getAppointment(id) {
    return DB.appointments.find((a) => a.id === id) || null;
  }

  // ---------------------------------------------------------------------
  // Motor de disponibilidade — regra central do sistema
  // ---------------------------------------------------------------------
  function getDayIntervals(dateStr, professionalId) {
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const businessDay = DB.businessHours[dow];
    if (!businessDay || !businessDay.open) return [];
    // (Arquitetura preparada para horários individuais por profissional;
    // hoje todos seguem o horário geral da barbearia.)
    return businessDay.intervals;
  }

  function isFullyBlocked(dateStr, professionalId) {
    return DB.blockedTimes.some((b) => b.professionalId === professionalId && b.date === dateStr && b.fullDay);
  }

  function getAvailableSlots(professionalId, dateStr, durationMin, { stepMin = 30 } = {}) {
    if (isFullyBlocked(dateStr, professionalId)) return [];
    const intervals = getDayIntervals(dateStr, professionalId);
    if (!intervals.length) return [];

    const blocks = DB.blockedTimes.filter((b) => b.professionalId === professionalId && b.date === dateStr && !b.fullDay);
    const appts = DB.appointments.filter(
      (a) => a.professionalId === professionalId && a.date === dateStr && a.status !== "CANCELADO"
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowMin = toMinutes(new Date().toTimeString().slice(0, 5));

    const slots = [];
    for (const interval of intervals) {
      const startMin = toMinutes(interval.start);
      const endMin = toMinutes(interval.end);
      for (let t = startMin; t + durationMin <= endMin; t += stepMin) {
        const slotEnd = t + durationMin;
        if (dateStr === todayStr && t <= nowMin) continue; // não permite agendar no passado

        const conflictsBlock = blocks.some((b) => rangesOverlap(t, slotEnd, toMinutes(b.startTime), toMinutes(b.endTime)));
        if (conflictsBlock) continue;

        const conflictsAppt = appts.some((a) => rangesOverlap(t, slotEnd, toMinutes(a.startTime), toMinutes(a.endTime)));
        if (conflictsAppt) continue;

        slots.push(toHHMM(t));
      }
    }
    return slots;
  }

  function validateAppointment({ professionalId, serviceId, date, startTime }) {
    const service = getService(serviceId);
    if (!service) return { ok: false, error: "Serviço inválido." };
    const duration = service.duration;
    const available = getAvailableSlots(professionalId, date, duration);
    if (!available.includes(startTime)) {
      return { ok: false, error: "Esse horário não está mais disponível. Escolha outro." };
    }
    return { ok: true, service, duration };
  }

  function createAppointment({ clientId, professionalId, serviceId, date, startTime, paymentMethod }) {
    const check = validateAppointment({ professionalId, serviceId, date, startTime });
    if (!check.ok) return { ok: false, error: check.error };

    const endTime = toHHMM(toMinutes(startTime) + check.duration);
    const appt = {
      id: uid("a"),
      clientId,
      professionalId,
      serviceId,
      date,
      startTime,
      endTime,
      status: "PENDENTE",
      price: check.service.price,
      paymentMethod: paymentMethod || "local",
      paymentStatus: paymentMethod === "pix" || paymentMethod === "cartao" ? "aguardando" : "pendente",
      createdAt: new Date().toISOString(),
      notes: "",
    };
    DB.appointments.push(appt);
    addNotification(getClient(clientId)?.userId, "AGENDAMENTO_CONFIRMADO", `Agendamento de ${check.service.name} confirmado para ${date} às ${startTime}.`);
    persist();
    return { ok: true, appointment: appt };
  }

  function updateAppointmentStatus(id, status) {
    const appt = getAppointment(id);
    if (!appt) return { ok: false, error: "Agendamento não encontrado." };
    appt.status = status;
    if (status === "CONCLUIDO" && appt.paymentMethod === "local") appt.paymentStatus = "pago";
    persist();
    return { ok: true, appointment: appt };
  }

  function cancelAppointment(id) {
    return updateAppointmentStatus(id, "CANCELADO");
  }

  function rescheduleAppointment(id, { date, startTime }) {
    const appt = getAppointment(id);
    if (!appt) return { ok: false, error: "Agendamento não encontrado." };
    const check = validateAppointment({ professionalId: appt.professionalId, serviceId: appt.serviceId, date, startTime });
    if (!check.ok) return { ok: false, error: check.error };
    appt.date = date;
    appt.startTime = startTime;
    appt.endTime = toHHMM(toMinutes(startTime) + check.duration);
    appt.status = "CONFIRMADO";
    persist();
    return { ok: true, appointment: appt };
  }

  function setPaymentStatus(appointmentId, status) {
    const appt = getAppointment(appointmentId);
    if (!appt) return { ok: false, error: "Agendamento não encontrado." };
    appt.paymentStatus = status;
    persist();
    return { ok: true, appointment: appt };
  }

  // ---------------------------------------------------------------------
  // Financeiro / Comissões
  // ---------------------------------------------------------------------
  function getCommissionSummary(professionalId, { dateFrom, dateTo } = {}) {
    const prof = getProfessional(professionalId);
    const appts = getAppointments({ professionalId, dateFrom, dateTo, status: "CONCLUIDO" });
    const totalProduced = appts.reduce((sum, a) => sum + (a.price || 0), 0);
    const commissionDue = Math.round(totalProduced * (prof.commissionPct / 100) * 100) / 100;
    const paid = DB.employeePayments
      .filter((p) => p.professionalId === professionalId && (!dateFrom || p.periodEnd >= dateFrom) && (!dateTo || p.periodStart <= dateTo))
      .reduce((sum, p) => sum + p.amountPaid, 0);
    return {
      totalProduced,
      commissionPct: prof.commissionPct,
      commissionDue,
      amountPaid: paid,
      amountPending: Math.round((commissionDue - paid) * 100) / 100,
      appointmentCount: appts.length,
    };
  }

  function registerEmployeePayment({ professionalId, periodStart, periodEnd, amountPaid, method, notes }) {
    const payment = {
      id: uid("ep"),
      professionalId,
      periodStart,
      periodEnd,
      amountPaid,
      method,
      notes: notes || "",
      date: new Date().toISOString(),
    };
    DB.employeePayments.push(payment);
    persist();
    return payment;
  }

  function getEmployeePayments(professionalId) {
    return DB.employeePayments.filter((p) => p.professionalId === professionalId).sort((a, b) => b.date.localeCompare(a.date));
  }

  function getRevenueSummary({ dateFrom, dateTo } = {}) {
    const appts = getAppointments({ dateFrom, dateTo });
    const concluded = appts.filter((a) => a.status === "CONCLUIDO");
    const cancelled = appts.filter((a) => a.status === "CANCELADO");
    const grossRevenue = concluded.reduce((s, a) => s + (a.price || 0), 0);
    const paid = concluded.filter((a) => a.paymentStatus === "pago").reduce((s, a) => s + (a.price || 0), 0);
    const pending = concluded.filter((a) => a.paymentStatus !== "pago").reduce((s, a) => s + (a.price || 0), 0);
    const totalCommissions = DB.professionals.reduce((sum, p) => sum + getCommissionSummary(p.id, { dateFrom, dateTo }).commissionDue, 0);
    return {
      grossRevenue,
      paid,
      pending,
      cancelledCount: cancelled.length,
      totalCommissions,
      netEstimate: Math.round((grossRevenue - totalCommissions) * 100) / 100,
      appointmentCount: appts.length,
      concludedCount: concluded.length,
    };
  }

  // ---------------------------------------------------------------------
  // Serviços / Profissionais — administração
  // ---------------------------------------------------------------------
  function upsertService(service) {
    if (service.id) {
      const idx = DB.services.findIndex((s) => s.id === service.id);
      if (idx >= 0) DB.services[idx] = { ...DB.services[idx], ...service };
    } else {
      service.id = uid("s");
      service.active = service.active !== false;
      DB.services.push(service);
    }
    persist();
    return service;
  }
  function deleteService(id) {
    DB.services = DB.services.filter((s) => s.id !== id);
    persist();
  }
  function upsertProfessional(prof) {
    if (prof.id) {
      const idx = DB.professionals.findIndex((p) => p.id === prof.id);
      if (idx >= 0) DB.professionals[idx] = { ...DB.professionals[idx], ...prof };
    } else {
      prof.id = uid("p");
      prof.active = prof.active !== false;
      DB.professionals.push(prof);
    }
    persist();
    return prof;
  }

  // ---------------------------------------------------------------------
  // Clientes (CRM)
  // ---------------------------------------------------------------------
  function listClientsWithStats() {
    return DB.clients.map((c) => {
      const user = getUser(c.userId);
      const appts = getAppointments({ clientId: c.id, status: "CONCLUIDO" });
      const last = appts.sort((a, b) => b.date.localeCompare(a.date))[0];
      return {
        ...c,
        name: user?.name,
        phone: user?.phone,
        email: user?.email,
        totalAppointments: appts.length,
        totalSpent: appts.reduce((s, a) => s + (a.price || 0), 0),
        lastVisit: last ? last.date : null,
        preferredProfessional: c.preferredProfessionalId ? getProfessional(c.preferredProfessionalId)?.displayName : "—",
      };
    });
  }
  function updateClientNotes(clientId, notes) {
    const c = getClient(clientId);
    if (c) {
      c.notes = notes;
      persist();
    }
  }

  // ---------------------------------------------------------------------
  // Notificações (arquitetura — pronta para WhatsApp/e-mail/push)
  // ---------------------------------------------------------------------
  function addNotification(userId, type, message) {
    if (!userId) return;
    DB.notifications.push({ id: uid("n"), userId, type, message, read: false, createdAt: new Date().toISOString() });
    persist();
  }
  function getNotifications(userId) {
    return DB.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------------------------------------------------------------------
  // Cadastro de cliente a partir de um novo usuário
  // ---------------------------------------------------------------------
  function createClientUser({ name, email, phone, passwordHash }) {
    if (getUserByEmail(email)) return { ok: false, error: "Já existe uma conta com este e-mail." };
    const user = { id: uid("u"), name, email, phone, role: "client", passwordHash, createdAt: new Date().toISOString() };
    DB.users.push(user);
    const client = { id: uid("c"), userId: user.id, notes: "", favoriteServiceIds: [], preferredProfessionalId: null };
    DB.clients.push(client);
    persist();
    return { ok: true, user, client };
  }

  global.FDG = global.FDG || {};
  global.FDG.db = {
    WEEKDAYS,
    getServices, getService, upsertService, deleteService,
    getProfessionals, getProfessional, upsertProfessional,
    getUser, getUserByEmail, getClientByUserId, getClient, listClientsWithStats, updateClientNotes,
    getBusinessHours, setBusinessHours,
    getSettings, setSettings,
    getBlockedTimes, addBlockedTime, removeBlockedTime,
    getAppointments, getAppointment, getAvailableSlots, validateAppointment,
    createAppointment, updateAppointmentStatus, cancelAppointment, rescheduleAppointment, setPaymentStatus,
    getCommissionSummary, registerEmployeePayment, getEmployeePayments, getRevenueSummary,
    getNotifications, addNotification,
    createClientUser,
    toMinutes, toHHMM,
    _reset: () => { DB = seed(); persist(); },
  };

  global.FDG.SESSION_KEY = SESSION_KEY;
})(window);
