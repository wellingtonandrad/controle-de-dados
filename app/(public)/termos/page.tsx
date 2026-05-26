import type { Metadata } from "next"
import { LegalPageLayout } from "../_components/legal-page-layout"

export const metadata: Metadata = {
  title: "Termos de uso | ERP profissional",
  description:
    "Termos de uso da plataforma ERP profissional (SaaS de gestão empresarial).",
  robots: { index: true, follow: true },
}

export default function TermosPage() {
  return (
    <LegalPageLayout title="Termos de uso">
      <p>
        Estes Termos de Uso regem o acesso e a utilização da{" "}
        <strong>solução ERP profissional</strong> disponibilizada como software
        como serviço (SaaS), incluindo site, aplicativos, APIs e recursos
        associados. Ao criar conta, acessar ou usar o serviço, o usuário
        declara ter lido e concordado com as condições abaixo, na versão vigente
        à data de uso.
      </p>

      <h2>1. Definições e objeto</h2>
      <p>
        O serviço destina-se à <strong>gestão empresarial integrada</strong>,
        podendo contemplar, conforme o plano e a configuração contratada,
        módulos como cadastros, vendas, compras, estoque, financeiro, relatórios,
        produção/industrialização, recursos humanos operacionais e demais
        funcionalidades divulgadas na interface. Integrações com terceiros
        (pagamentos, armazenamento, comunicação, etc.) observam a documentação e
        as condições de cada provedor.
      </p>

      <h2>2. Elegibilidade, cadastro e contas</h2>
      <ul>
        <li>
          O cadastro deve ser feito com informações verdadeiras, completas e
          atualizadas. Perfis de administrador e de equipe devem refletir a
          estrutura autorizada pela organização contratante.
        </li>
        <li>
          A <strong>organização contratante</strong> é responsável pelo uso
          feito por seus usuários, pela guarda de credenciais, pela revogação de
          acessos e pela conformidade do uso com a lei e com estes Termos.
        </li>
        <li>
          É vedado compartilhar credenciais de forma que prejudique segurança,
          auditoria ou rastreabilidade das operações no sistema.
        </li>
      </ul>

      <h2>3. Licença de uso e propriedade intelectual</h2>
      <p>
        Concede-se licença de uso não exclusiva, intransferível e revogável,
        limitada ao acesso ao SaaS na forma contratada. O software, marcas,
        layout, documentação e demais conteúdos permanecem de titularidade dos
        respectivos proprietários. É proibida engenharia reversa, cópia não
        autorizada, scraping abusivo ou tentativa de burlar controles técnicos.
      </p>

      <h2>4. Planos, faturamento e suspensão</h2>
      <p>
        Quando houver planos pagos, preços, periodicidade, limites de uso e
        condições específicas serão apresentados no fluxo de contratação ou no
        painel. Pagamentos podem ser processados por parceiros financeiros. O
        inadimplemento ou o uso em desacordo com o contrato pode ensejar
        suspensão, limitação de funcionalidades ou encerramento da conta, nos
        termos da política comercial e legal aplicável, com comunicação quando
        exigida.
      </p>

      <h2>5. Uso aceitável e condutas proibidas</h2>
      <p>É proibido utilizar a plataforma para:</p>
      <ul>
        <li>Finalidades ilegais, violação de direitos de terceiros ou fraude;</li>
        <li>
          Distribuição de malware, ataques (incluindo negação de serviço),
          exploração de vulnerabilidades ou acesso não autorizado a sistemas ou
          dados;
        </li>
        <li>
          Extração massiva de dados sem autorização, revenda não autorizada do
          acesso ou qualquer uso que comprometa a estabilidade, a segurança ou
          a reputação do serviço.
        </li>
      </ul>

      <h2>6. Dados, conformidade e responsabilidade do cliente</h2>
      <p>
        Os dados inseridos pela organização (incluindo dados de colaboradores,
        clientes, fornecedores e parceiros) são de sua responsabilidade quanto à
        licitude, exatidão, necessidade, base legal e retenção, conforme a LGPD
        e demais normas do seu setor. A organização deve obter bases legais e
        informações aos titulares quando for controladora desses dados. A{" "}
        <strong>Política de Privacidade</strong> complementa este documento
        quanto ao tratamento de dados pessoais na relação com a plataforma.
      </p>

      <h2>7. Disponibilidade, manutenção e evolução do produto</h2>
      <p>
        O serviço é prestado conforme disponibilidade técnica do ambiente em
        nuvem. Podem ocorrer manutenções programadas ou corretivas, atualizações
        de segurança e indisponibilidades temporárias. Funcionalidades podem ser
        alteradas, ampliadas ou descontinuadas; quando a mudança for material,
        poderá ser oferecida comunicação prévia razoável, salvo motivos legais,
        de segurança ou operacionais urgentes.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei aplicável, a plataforma não se
        responsabiliza por lucros cessantes, perda de dados causada por culpa
        exclusiva do usuário, decisões de negócio tomadas com base em
        informações incorretas cadastradas na conta, ou danos indiretos. Não há
        garantia de resultado econômico ou de adequação a requisitos
        regulatórios específicos de cada empresa — cabe ao cliente validar o uso
        com seus consultores legais e contábeis.
      </p>

      <h2>9. Rescisão</h2>
      <p>
        O encerramento da conta pode ocorrer por solicitação do cliente, pelo
        fim do contrato ou por violação destes Termos. Após o encerramento,
        poderão ser observados prazos de guarda legal e políticas de backup ou
        exclusão descritas na documentação do serviço.
      </p>

      <h2>10. Lei aplicável, foro e alterações</h2>
      <p>
        Estes Termos podem ser atualizados para refletir mudanças legais ou no
        serviço. O uso continuado após a publicação das alterações pode
        constituir aceitação, salvo quando a lei exigir consentimento específico.
        Para questões contratuais, aplicam-se a lei brasileira e o foro da
        comarca do domicílio do fornecedor do serviço, salvo disposição legal
        imperativa em contrário ou cláusula contratual específica firmada entre
        as partes.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos devem ser encaminhadas ao canal de suporte
        ou e-mail oficial divulgado na aplicação ou no site do fornecedor.
      </p>
    </LegalPageLayout>
  )
}
