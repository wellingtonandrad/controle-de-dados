import type { Metadata } from "next"
import { LegalPageLayout } from "../_components/legal-page-layout"

export const metadata: Metadata = {
  title: "Termos de uso | Controle de dados",
  description: "Termos de uso da plataforma Controle de dados.",
  robots: { index: true, follow: true },
}

export default function TermosPage() {
  return (
    <LegalPageLayout title="Termos de uso">
      <p>
        Estes termos regem o uso da plataforma Controle de dados pelos usuários
        cadastrados (clínicas, profissionais e equipe autorizada). Ao utilizar o
        serviço, você declara que leu e concorda com as condições abaixo, na
        versão vigente à data de uso.
      </p>

      <h2>1. Objeto do serviço</h2>
      <p>
        O Controle de dados oferece ferramentas digitais para apoio à gestão de
        clínicas odontológicas, incluindo funcionalidades que podem envolver
        agendamento, cadastros, relatórios, estoque e integrações com
        prestadores terceiros (por exemplo, pagamentos e armazenamento de
        arquivos), conforme disponibilizado em cada momento.
      </p>

      <h2>2. Cadastro e responsabilidade da conta</h2>
      <ul>
        <li>
          As informações fornecidas no cadastro devem ser verdadeiras e
          atualizadas.
        </li>
        <li>
          A clínica é responsável pelas contas de sua equipe e pelo uso feito
          com credenciais válidas.
        </li>
        <li>
          É vedado compartilhar login de forma que comprometa a segurança ou a
          rastreabilidade das ações no sistema.
        </li>
      </ul>

      <h2>3. Planos, pagamentos e cancelamento</h2>
      <p>
        Quando houver planos pagos, os valores, periodicidade e condições
        específicas serão apresentados no momento da contratação. Pagamentos
        podem ser processados por parceiros (como operadoras de cartão). O
        não-pagamento pode implicar suspensão ou limitação do acesso, conforme
        a política comercial vigente.
      </p>

      <h2>4. Uso aceitável</h2>
      <p>É proibido utilizar a plataforma para:</p>
      <ul>
        <li>Finalidades ilegais ou violação de direitos de terceiros;</li>
        <li>
          Envio de malware, sobrecarga indevida ou tentativa de acesso não
          autorizado a sistemas ou dados;
        </li>
        <li>Qualquer uso que prejudique a estabilidade ou a segurança do serviço.</li>
      </ul>

      <h2>5. Conteúdo e dados da clínica</h2>
      <p>
        Os dados inseridos pela clínica permanecem sob sua responsabilidade
        quanto à licitude, exatidão e necessidade de guarda em conformidade com
        a legislação aplicável (incluindo normas de saúde e proteção de dados).
        A política de privacidade complementa este documento quanto ao
        tratamento de dados pessoais.
      </p>

      <h2>6. Disponibilidade e evolução do produto</h2>
      <p>
        O serviço é fornecido na forma em que estiver disponível. Podem ocorrer
        manutenções, atualizações ou indisponibilidades temporárias. Funcionalidades
        podem ser alteradas, incluídas ou descontinuadas, com comunicação
        razoável quando aplicável.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Na extensão máxima permitida pela lei aplicável, a plataforma não se
        responsabiliza por danos indiretos, lucros cessantes ou perdas
        decorrentes de decisões clínicas, uso inadequado do software ou de
        informações incorretas cadastradas pelos usuários.
      </p>

      <h2>8. Alterações destes termos</h2>
      <p>
        Estes termos podem ser atualizados. A data da última revisão pode ser
        indicada nesta página. O uso continuado após alterações constitui
        ciência das mudanças, salvo quando a lei exigir consentimento específico.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas sobre estes termos devem ser encaminhadas ao canal de suporte ou
        e-mail divulgado pela plataforma.
      </p>
    </LegalPageLayout>
  )
}
