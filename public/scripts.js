import {
  toggleTela,
  carregarCSS,
  calcularStatus,
  traduzirStatus,
  createTextDiv,
  setErrorFor,
  setSuccessFor,
  salvarItemNoServidor,
  preencherFormulario,
} from "./utils.js";

const API_URL = "http://localhost:3000";

// Faz o fetch do HTML da tela que será renderizada.
const carregarTela = (btnSelector, telaId, htmlFile) => {
  const promises = [];
  document.querySelectorAll(btnSelector).forEach((btn) => {
    const promise = fetch(htmlFile)
      .then((response) => response.text())
      .then((html) => {
        const container = document.getElementById(telaId);
        container.innerHTML = html;

        // Evita duplicar o CSS.
        carregarCSS();

        initializeForm(telaId);
        toggleTela(telaId, true);
      })
      .catch((err) => console.error(`Erro ao carregar ${htmlFile}:`, err));

    promises.push(promise);
  });

  return promises[0];
};

// variáveis para ordenação.
let sortByStatus = localStorage.getItem("ordenarPorStatus") === "true";
let sortByName =
  !sortByStatus || localStorage.getItem("ordenarPorNome") === "true";

let selectedItems = [];

// Tabela de items.
const itemContainer = document.querySelector(".table .func");

//mostra uma mensagem caso a tabela não tenha funcionários cadastrados.
async function checkEmptyTable(firstTime) {
  try {
    const response = await fetch(`${API_URL}/items/empty`);
    const data = await response.json();

    const btnSortByStatus = document.getElementById("btnSortByStatus");

    // Remove mensagem antiga, se existir.
    const msg = itemContainer.querySelector(".AlertMessage");
    if (msg) msg.remove();

    if (data.empty) {
      const alertContainer = document.createElement("div");
      alertContainer.classList.add("AlertMessage");

      const errorAlert = document.createElement("i");

      // Ícone ao regarregar a página.
      if (firstTime) {
        errorAlert.classList.add(
          "fa-solid",
          "fa-person-circle-plus",
          "iconAlert"
        );

        alertContainer.appendChild(errorAlert);
        alertContainer.appendChild(
          createTextDiv("Cadastre algum funcionário!")
        );
        itemContainer.appendChild(alertContainer);
        document.querySelectorAll(".iconAlert").forEach((btn) => {
          btn.addEventListener("click", () => {
            clearSelectedItems();
            carregarTela(
              ".iconAlert",
              "registerForm",
              "forms/RegisterForm.html"
            );
          });
        });
      }

      // Ícone ao excluir todos funcionários.
      else {
        errorAlert.classList.add(
          "fa-solid",
          "fa-person-circle-xmark",
          "iconAlert"
        );
        alertContainer.appendChild(errorAlert);
        alertContainer.appendChild(
          createTextDiv("Nenhum funcionário cadastrado!")
        );
        itemContainer.appendChild(alertContainer);
      }

      // Desativa botão de filtro
      btnSortByStatus.classList.remove("sortClicked");
      btnSortByStatus.classList.add("invisible");
      localStorage.setItem("ordenarPorStatus", false);
      sortByStatus = false;
    } else {
      // Ativa botão
      btnSortByStatus.classList.remove("invisible");
    }
  } catch (error) {
    console.error("Erro ao verificar tabela vazia:", error);
  }
}

function clearSelectedItems() {
  const selecionados = document.querySelectorAll(".Item.ItemSelected");
  // Remove a classe 'selecionado' de cada item.
  selecionados.forEach((item) => item.classList.remove("ItemSelected"));

  // Limpa o array que armazena as matrículas selecionadas.
  selectedItems = [];
}

// Recarregamento dos items.
const refreshItemsAPI = async (
  sortByStatus = false,
  sortByName = false,
  firstTime
) => {
  try {
    const response = await fetch(`${API_URL}/items`);
    const items = await response.json();

    // Aplica ordenação se necessário.
    if (sortByStatus || sortByName) {
      items.forEach((item) => {
        item.statusClass = calcularStatus(item.inicio, item.fim);
      });

      const statusOrder = {
        ferias: 0,
        agendado: 1,
        finalizado: 2,
        semAgendamento: 3,
      };

      items.sort((a, b) => {
        // comparação por status.
        if (sortByStatus) {
          const aStatus = statusOrder[a.statusClass] ?? 99;
          const bStatus = statusOrder[b.statusClass] ?? 99;
          if (aStatus !== bStatus) {
            return aStatus - bStatus;
          }
        }

        // comparação por nome (ordem alfabética).
        if (sortByName) {
          return a.func_name
            .toUpperCase()
            .localeCompare(b.func_name.toUpperCase(), "pt-BR", {
              sensitivity: "base",
            });
        }

        return 0;
      });
    }

    // Container para incluir itens.
    itemContainer.innerHTML = "";

    for (const item of items) {
      const tableItemContainer = document.createElement("div");
      tableItemContainer.classList.add("Item", "gridRow");

      // Incluindo as informações do item.
      const funcnome = createTextDiv(item.func_name);
      funcnome.classList.add("textName");
      const setor = createTextDiv(item.setor);
      const matricula = createTextDiv(item.matricula);
      const inicio = createTextDiv(item.inicio ?? "-----");
      const fim = createTextDiv(item.fim ?? "-----");
      const status = document.createElement("div");
      // Aplica o Status no item.
      const statusClass = calcularStatus(item.inicio, item.fim);
      status.classList.add(statusClass);
      status.textContent = traduzirStatus(statusClass);

      const btnEdit = document.createElement("i");
      btnEdit.classList.add("fas", "fa-edit", "btnEdit");

      btnEdit.addEventListener("click", (event) => {
        event.stopPropagation();

        fetch("./forms/EditForm.html")
          .then((response) => response.text())
          .then((html) => {
            const container = document.getElementById("editForm");
            container.innerHTML = html;

            carregarCSS();
            clearSelectedItems();

            initializeForm("editForm");
            preencherFormulario(item);
            toggleTela("editForm", true);
          })
          .catch((err) =>
            console.error("Erro ao carregar editForm.html:", err)
          );
      });

      // seleção de item.
      tableItemContainer.addEventListener("click", () => {
        const id = item.matricula;

        if (tableItemContainer.classList.contains("ItemSelected")) {
          tableItemContainer.classList.remove("ItemSelected");
          selectedItems = selectedItems.filter((m) => m !== id);
        } else {
          tableItemContainer.classList.add("ItemSelected");
          selectedItems.push(id);
        }
      });

      // adicionando as informações no container.
      tableItemContainer.appendChild(funcnome);
      tableItemContainer.appendChild(setor);
      tableItemContainer.appendChild(matricula);
      tableItemContainer.appendChild(inicio);
      tableItemContainer.appendChild(fim);
      tableItemContainer.appendChild(status);
      tableItemContainer.appendChild(btnEdit);

      itemContainer.appendChild(tableItemContainer);
    }
    await checkEmptyTable(firstTime);
  } catch (error) {
    console.error("Erro ao buscar itens do servidor:", error);
  }
};

// Botão para excluir itens selecionados.
const btnDeleteItems = document.getElementById("btnDeleteItems");
btnDeleteItems.addEventListener("click", async () => {
  if (selectedItems.length === 0) {
    alert("Nenhum item selecionado.");
    return;
  }

  const confirmation = confirm(
    `Tem certeza que deseja excluir os itens selecionados?`
  );

  if (!confirmation) return;

  const response = await fetch(`${API_URL}/items/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matriculas: selectedItems }),
  });

  if (!response.ok) {
    alert("Erro ao excluir");
    return;
  }

  selectedItems = [];

  await refreshItemsAPI(sortByStatus, sortByName, false);
});

// Botão para aplicar o filtro.
const btnSortByStatus = document.getElementById("btnSortByStatus");
btnSortByStatus.addEventListener("click", () => {
  if (!sortByStatus) {
    btnSortByStatus.classList.add("sortClicked");
  } else {
    btnSortByStatus.classList.remove("sortClicked");
  }
  sortByStatus = !sortByStatus;
  // Salva o valor do filtro no localStorage.
  localStorage.setItem("ordenarPorStatus", sortByStatus);

  refreshItemsAPI(sortByStatus, sortByName);
});

// Inicializa a aplicação após o carregamento do DOM.
document.addEventListener("DOMContentLoaded", () => {
  refreshItemsAPI(sortByStatus, sortByName, true).then();

  // Ativar o botão para abrir o cadastro ao clicar.
  document.querySelectorAll(".btnAddForm").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearSelectedItems();
      carregarTela(".btnAddForm", "registerForm", "forms/RegisterForm.html");
    });
  });
});

let ableExport = true;
// Botão para exportar a tabela
document.getElementById("btnExportExcel").addEventListener("click", () => {
  // evita múltiplas exportações
  if (!ableExport) return;
  ableExport = false;

  setTimeout(() => (ableExport = true), 3500);
  clearSelectedItems();
  try {
    const linhas = document.querySelectorAll(".table .func .Item");

    const data = [["Nome", "Setor", "Matrícula", "Início", "Fim", "Status"]];

    linhas.forEach((linha) => {
      const colunas = linha.querySelectorAll("div");
      if (colunas.length < 6) return;

      const nome = colunas[0].textContent.trim();
      const setor = colunas[1].textContent.trim();
      const matricula = colunas[2].textContent.trim();
      const inicio = colunas[3].textContent.trim();
      const fim = colunas[4].textContent.trim();
      const status = colunas[5].textContent.trim();

      data.push([nome, setor, matricula, inicio, fim, status]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");

    XLSX.writeFile(workbook, "lista_funcionarios.xlsx");
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error);
    alert("Erro ao exportar os dados.");
  }
});

const nameRegex = /^[A-Za-zÀ-ÿ\s]+$/;

// Tela de cadastro.
function initializeForm(telaId) {
  const tela = document.getElementById(telaId);
  const funcnome = tela.querySelector("#funcNome");
  const setor = tela.querySelector("#setor");
  const matricula = tela.querySelector("#matricula");
  const inicio = tela.querySelector("#inicio");
  const fim = tela.querySelector("#fim");
  const inicioContainer = tela.querySelector("#inicio-container");
  const fimContainer = tela.querySelector("#fim-container");
  const checkbox = tela.querySelector("#checkbox");
  const days = tela.querySelector("#days");
  const rest = tela.querySelector("#rest");
  const total = tela.querySelector("#total");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Clona e substitui o checkbox para remover event listeners antigos.
  const checkboxState = checkbox.cloneNode(true);
  checkbox.parentNode.replaceChild(checkboxState, checkbox);

  // Modifica os inputs de inicio e fim através da checkbox.
  checkboxState.addEventListener("change", () => {
    if (checkboxState.checked) {
      inicioContainer.classList.add("invisible");
      fimContainer.classList.add("invisible");
      days.style.display = "none";
    } else {
      inicioContainer.classList.remove("invisible");
      fimContainer.classList.remove("invisible");
    }

    /*
    Os campos dos dias restantes e total só irão ser visíveis caso o form 
    seja de edição e caso o status do funcionário seja "férias"
    */
    if (
      telaId === "editForm" &&
      !checkboxState.checked &&
      inicio.value &&
      fim.value &&
      calcularStatus(inicio.value, fim.value) === "ferias"
    ) {
      days.style.display = "flex";
      const startDate = new Date(inicio.value);
      const endDate = new Date(fim.value);

      // Calcula os dias.
      const umDia = 24 * 60 * 60 * 1000;
      const rangeDays = Math.round((endDate - startDate) / umDia) + 1;
      const remainingDays = Math.max(0, Math.round((endDate - today) / umDia));

      total.textContent = `Total de dias: ${rangeDays}`;
      rest.textContent = `Dias restantes: ${remainingDays}`;
    }
  });

  // Dispara o evento para aplicar o estado inicial correto.
  checkboxState.dispatchEvent(new Event("change"));

  // Validação dos inputs.
  async function checkInputs(isAtualizacao = false) {
    const funcnomeValue = funcnome.value.trim();
    const matriculaValue = matricula.value.trim();
    const setorValue = setor.value.trim();

    let isValid = true;

    let items = [];
    try {
      const response = await fetch(`${API_URL}/items`);
      items = await response.json();
    } catch (error) {
      console.error("Erro ao buscar itens do servidor:", error);
      alert("Erro ao validar dados. Tente novamente.");
      return false;
    }

    if (funcnomeValue === "") {
      setErrorFor(funcnome, "O nome de funcionário é obrigatório.");
      isValid = false;
    } else if (!nameRegex.test(funcnomeValue)) {
      setErrorFor(funcnome, "O nome deve conter apenas letras.");
      isValid = false;
    } else {
      setSuccessFor(funcnome);
    }

    if (matriculaValue === "") {
      setErrorFor(matricula, "A matrícula do funcionário é obrigatória.");
      isValid = false;
    } else if (matriculaValue.length !== 5) {
      setErrorFor(matricula, "A matrícula precisa ter 5 dígitos.");
      isValid = false;
    } else if (
      !isAtualizacao &&
      items.some((item) => item.matricula === matriculaValue)
    ) {
      setErrorFor(matricula, "Esta matrícula já está cadastrada.");
      isValid = false;
    } else if (isAtualizacao) {
      const matriculaOriginal =
        document.getElementById("matriculaOriginal")?.value;
      const duplicada = items.some(
        (item) =>
          item.matricula === matriculaValue &&
          item.matricula !== matriculaOriginal
      );
      if (duplicada) {
        setErrorFor(matricula, "Outra pessoa já está usando esta matrícula.");
        isValid = false;
      } else {
        setSuccessFor(matricula);
      }
    } else {
      setSuccessFor(matricula);
    }

    if (!setorValue) {
      setErrorFor(setor, "O setor de funcionário é obrigatório.");
      isValid = false;
    } else {
      setSuccessFor(setor);
    }

    if (!checkboxState.checked) {
      if (inicio.value.trim() === "") {
        setErrorFor(inicio, "Selecione a data de início das férias");
        isValid = false;
      } else {
        setSuccessFor(inicio);
      }

      const startDate = new Date(inicio.value.trim());
      const endDate = new Date(fim.value.trim());
      const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

      if (fim.value.trim() === "") {
        setErrorFor(fim, "Selecione a data do fim das férias");
        isValid = false;
      } else if (inicio.value.trim() >= fim.value.trim()) {
        setErrorFor(fim, "A data do fim das férias deve ser após o início");
        isValid = false;
      } else if (diffDays > 30) {
        setErrorFor(fim, "As férias não podem exceder 30 dias.");
        isValid = false;
      } else {
        setSuccessFor(fim);
      }
    }

    return isValid;
  }

  // Botão para cadastrar.
  const addItemButton = tela.querySelector("#btnCreate");
  if (addItemButton) {
    addItemButton.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!(await checkInputs())) return;

      const item = {
        func_name: funcnome.value.toUpperCase(),
        setor: setor.options[setor.selectedIndex].text.toUpperCase(),
        matricula: matricula.value,
        inicio: checkboxState.checked ? null : inicio.value,
        fim: checkboxState.checked ? null : fim.value,
        statusClass: calcularStatus(
          checkboxState.checked ? null : inicio.value,
          checkboxState.checked ? null : fim.value
        ),
      };

      await salvarItemNoServidor(API_URL, item);

      await refreshItemsAPI(sortByStatus, sortByName);

      toggleTela(telaId, false);
    });
  }

  // Botão para cancelar.
  const btnCancel = tela.querySelector("#btnCancel");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      toggleTela(telaId, false);
    });
  }

  // Botão para excluir.
  const btnDelete = tela.querySelector("#btnDelete");
  if (btnDelete) {
    btnDelete.addEventListener("click", async (e) => {
      e.preventDefault();

      // Pega a matrícula original, não a que está visível.
      const matriculaOriginal = tela.querySelector("#matriculaOriginal")?.value;
      if (!matriculaOriginal) {
        alert("Matrícula não encontrada.");
        return;
      }

      const confirmation = confirm("Tem certeza que deseja excluir este item?");
      if (!confirmation) return;

      try {
        const response = await fetch(`${API_URL}/items/${matriculaOriginal}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          alert("Erro ao excluir o item.");
          return;
        }

        // Atualiza a lista com nova ordem
        await refreshItemsAPI(sortByStatus, sortByName, false);

        // Fecha a tela de edição
        toggleTela(telaId, false);
      } catch (error) {
        console.error("Erro ao excluir item:", error);
        alert("Erro na comunicação com o servidor.");
      }
    });
  }

  // Botão para Atualizar.
  const btnUpdate = tela.querySelector("#btnUpdate");
  if (btnUpdate) {
    btnUpdate.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!(await checkInputs(true))) return;

      const matriculaOriginal = tela.querySelector("#matriculaOriginal")?.value;
      if (!matriculaOriginal) {
        alert("Matrícula original não encontrada.");
        return;
      }

      const updatedItem = {
        func_name: funcnome.value.toUpperCase(),
        setor: setor.options[setor.selectedIndex].text.toUpperCase(),
        matricula: matricula.value,
        inicio: checkboxState.checked ? null : inicio.value,
        fim: checkboxState.checked ? null : fim.value,
        statusClass: calcularStatus(
          checkboxState.checked ? null : inicio.value,
          checkboxState.checked ? null : fim.value
        ),
      };

      try {
        const response = await fetch(`${API_URL}/items/${matriculaOriginal}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Erro ao atualizar: ${errorData.error || response.statusText}`);
          return;
        }

        // Recarrega lista já com ordenação correta
        await refreshItemsAPI(sortByStatus, sortByName);
        // Fecha tela de edição
        toggleTela(telaId, false);
      } catch (error) {
        alert("Erro na comunicação com o servidor.");
        console.error(error);
      }
    });
  }
}
