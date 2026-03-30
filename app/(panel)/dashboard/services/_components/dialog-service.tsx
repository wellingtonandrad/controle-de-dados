"use client"

//valor em centavos = valor em reais * 100
//valor em reais = valor em centavos / 100
import { useState } from "react"
import { X } from "lucide-react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useDialogServiceForm, DialogServiceFormValues } from "./dialog-service-form"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input} from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { convertRealToCents } from "@/app/utils/convertCurrency"
import { createNewService } from "../_actions/create-service"
import { updateService } from "../_actions/update-service"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DialogServiceProps{
    closeModal: () => void;
    serviceId?: string;
    initialValues?: {
      name: string;
      price: string;
      hours: string;
      minutes: string;
    }
}

export function DialogService({closeModal, initialValues, serviceId}: DialogServiceProps){



  const form = useDialogServiceForm( { initialValues: initialValues } )
  const [ loading, setLoading ] = useState(false);
  const router = useRouter();


  async function onSubmit(values: DialogServiceFormValues) {
         setLoading(true);
         const priceInCents = convertRealToCents(values.price)
         const hours = parseInt(values.hours) || 0;
         const minutes = parseInt(values.minutes) || 0;

         const duration = (hours * 60) + minutes;

         if(serviceId){
           await editServiceById({
             serviceId: serviceId,
             name: values.name,
             priceInCents: priceInCents,
             duration: duration
           })

           setLoading(false);
            return;

         }

         const response = await createNewService({
            name: values.name,
            price: priceInCents,
            duration: duration
         })

         setLoading(false);

         if(response?.error){
            toast.error(response.error)
            return;
  }

  toast.success("Serviço cadastrado com sucesso!")
  handleCloseModal()
  router.refresh()
  }

  

  async function editServiceById({
     serviceId,
     name, 
     priceInCents, 
     duration }: { serviceId: string, 
      name: string, 
      priceInCents: number, 
      duration: number
    }) {          
      //Aqui vamos atualizar o serviço


      const response = await updateService({
         serviceId: serviceId,
         name: name,
         price: priceInCents,
         duration: duration
      })

setLoading(false);


if(response.error) {
  toast.error(response.error)
  return;
}

  toast.success(
      typeof response.data === "string"
        ? response.data
        : "Serviço atualizado com sucesso!"
    )
    handleCloseModal()
    router.refresh()
  }

function handleCloseModal(){
    form.reset();
    closeModal();
  }


  function changeCurrency(event: React.ChangeEvent<HTMLInputElement>){
      let { value } = event.target;
      value = value.replace(/\D/g,"");

      if(value){
        value=(parseInt(value, 10) / 100).toFixed(2);
        value = value.replace(".", ",");
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      
        //encontrar grupo de três digitos que estejam seguidos por outro grupo de três digitos que não estejam seguidos por outro grupo de três.
        //garatindo que os pontos sejam inseridos entre os  milhares
      }

      event.target.value = value;
      form.setValue("price", value)

  }

    return(
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={handleCloseModal}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="pr-10">
            <DialogTitle> Novo serviço </DialogTitle>
            <DialogDescription>
                Adicione um novo serviço
            </DialogDescription>
          </DialogHeader>

        <Form {...form}>
            <form
              className="space-y-2"
              onSubmit={form.handleSubmit(onSubmit)}
            >
                
                <div className="flex flex-col ">
                    <FormField 
                       control={form.control}
                       name="name"
                       render={ ({ field }) => (
                          <FormItem className="my-2">
                            <FormLabel className="font-semibold" >
                                Nome do serviço:
                            </FormLabel>
                            <FormControl>
                                <Input {...field} 
                                placeholder="Digite o nome do serviço..." />
                            </FormControl>
                          </FormItem>
                       )}
                    />

                       <FormField 
                       control={form.control}
                       name="price"
                       render={ ({ field }) => (
                          <FormItem className="my-2" >
                            <FormLabel className="font-semibold" >
                                Valor do serviço:
                            </FormLabel>
                            <FormControl>
                                <Input {...field} 
                                placeholder="Ex 120,00" 
                                onChange={changeCurrency}
                                />
                            </FormControl>
                          </FormItem>
                       )}
                    />
                </div>

                <p className="font-semibold"> Tempo de duração do serviço:</p>
                <div className="grid grid-cols-2 gap-3" >
                <FormField 
                       control={form.control}
                       name="hours"
                       render={ ({ field }) => (
                          <FormItem className="my-2" >
                            <FormLabel className="font-semibold" >
                                Horas:
                            </FormLabel>
                            <FormControl>
                                <Input {...field} 
                                placeholder="1" 
                                min="0"
                                type="number"
                                />
                            </FormControl>
                          </FormItem>
                       )}
                    />

                    <FormField 
                       control={form.control}
                       name="minutes"
                       render={ ({ field }) => (
                          <FormItem className="my-2" >
                            <FormLabel className="font-semibold" >
                                Minutos:
                            </FormLabel>
                            <FormControl>
                                <Input {...field} 
                                placeholder="1" 
                                min="0"
                                type="number"
                                />
                            </FormControl>
                          </FormItem>
                       )}
                    />
                </div>

                <Button 
                type="submit" 
                className="w-full font-semibold text-white "
                disabled={loading}
                >
                 {loading? "Carregando..." : `${serviceId ? "Atualizar serviço" : "Cadastrar serviço"}`}
                </Button>
                  

            </form>
        </Form>
        </div>
    )
}