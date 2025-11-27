// Altera qual tela será carregada, tela de cadastro ou edição.
export const toggleTela = (telaId, show) => {
  const tela = document.getElementById(telaId);
  const homePage = document.getElementById("homePage");

  tela.style.display = show ? "block" : "none";
  homePage.style.display = show ? "none" : "block";

  if (!show) tela.innerHTML = "";
};

// Carrega o CSS da tela.
export function carregarCSS() {
  if (!document.querySelector('link[href="styleForm.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "styleForm.css";
    document.head.appendChild(link);
  }
}

// Calcular o status do funcionário.
export function calcularStatus(inicio, fim) {
  if (!inicio || !fim) return "semAgendamento";

  const hoje = new Date();
  const inicioDate = new Date(`${inicio}T00:00:00`);
  const fimDate = new Date(`${fim}T00:00:00`);

  if (isNaN(inicioDate) || isNaN(fimDate)) {
    return "semAgendamento";
  }

  hoje.setHours(0, 0, 0, 0);
  inicioDate.setHours(0, 0, 0, 0);
  fimDate.setHours(0, 0, 0, 0);

  if (hoje < inicioDate) return "agendado";
  if (hoje > fimDate) return "finalizado";
  return "ferias";
}

// Retorna o texto da classe.
export function traduzirStatus(statusClass) {
  switch (statusClass) {
    case "semAgendamento":
      return "Sem agendamento";
    case "agendado":
      return "Agendado";
    case "finalizado":
      return "Férias finalizadas";
    case "ferias":
      return "Férias";
    default:
      return "Desconhecido";
  }
}

// Função para criar as informações do funcionário no item.
export function createTextDiv(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div;
}

// Marca visualmente um campo de formulário como inválido.
export function setErrorFor(input, message) {
  const formControl = input.parentElement;

  if (!formControl) {
    console.error("Elemento 'formControl' não encontrado");
    return;
  }

  const small = formControl.querySelector("small");

  if (!small) {
    console.error("Elemento 'small' não encontrado");
    return;
  }

  small.innerText = message;
  formControl.className = "form-control error";
}

// Marca visualmente um campo de formulário como válido.
export function setSuccessFor(input) {
  const formControl = input.parentElement;
  formControl.className = "form-control success";
}

// Salva um novo item no servidor.
export const salvarItemNoServidor = async (API_URL, item) => {
  try {
    const response = await fetch(`${API_URL}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar item.");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao enviar item:", error);
  }
};

// Preenche os campos dos inputs no formulário de edição.
export function preencherFormulario(item) {
  const editForm = document.getElementById("editForm");
  if (!editForm) return;

  editForm.querySelector("#funcNome").value = item.func_name;
  editForm.querySelector("#matricula").value = item.matricula;
  const selectSetor = editForm.querySelector("#setor");

  // Verifica se o valor salvo corresponde ao texto visível.
  for (const option of selectSetor.options) {
    if (option.text.trim().toUpperCase() === item.setor.trim().toUpperCase()) {
      selectSetor.value = option.value;
      break;
    }
  }
  editForm.querySelector("#inicio").value = item.inicio ?? "";
  editForm.querySelector("#fim").value = item.fim ?? "";

  const checkbox = editForm.querySelector("#checkbox");
  if (checkbox) {
    checkbox.checked = item.inicio === null && item.fim === null;
    checkbox.dispatchEvent(new Event("change"));
  }

  // Armazena a matrícula original para excluir ou atualizar.
  let inputOriginal = editForm.querySelector("#matriculaOriginal");
  if (!inputOriginal) {
    inputOriginal = document.createElement("input");
    inputOriginal.type = "hidden";
    inputOriginal.id = "matriculaOriginal";
    editForm.querySelector("form").appendChild(inputOriginal);
  }
  inputOriginal.value = item.matricula;
}
