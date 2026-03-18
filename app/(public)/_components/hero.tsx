import { Button } from "@/components/ui/button";
import Image from "next/image";
import imgDoctor from "../../../public/doctor-hero.png"

export function Hero(){
    return(
        <section className="bg-white" >
            <div className="container mx-auto px-4 pt-20 pb-4 sm:pb-0 sm:px-6 lg:px-8" >
             
        <main className="flex items-center justify-center" >
            <article className="flex[2] max-w-3xl space-y-8 flex flex-col justify-center " >
                <h1 className="text-4xl lg:text-5xl font-bold max-w-2xl tracking-tight" >
                   Encontre os melhores profissionais em um único local! 
                </h1>
                <p className="text-base md:text-lg text-gray-600" >
                  Nós somos a melhor plataforma para profissionais da saúde com foco
                  em agilizar o seu agendamento de forma simplificada e organizada. 
                </p>
                <Button className="bg-emerald-500 hover:bg-emerald-400 w-fit px-6 font-semibold">
                    Encontre uma clinica
                </Button>
            </article>
        
        <div className="hidden lg:block" >
           <Image
             src={imgDoctor}
             alt="Foto ilustrativa"
             width={700}
             height={600}
             className="object-contain"
             quality={100}
             priority
           /> 
        </div>

        </main>       

            </div>
        </section>
    )
}