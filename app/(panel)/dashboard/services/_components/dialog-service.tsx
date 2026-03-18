"use client"

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useDialogServiceForm } from "./dialog-service-form"
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


export function DialogService(){

  const form = useDialogServiceForm()

    return(
        <>
          <DialogHeader>
            <DialogTitle> Novo serviço </DialogTitle>
            <DialogDescription>
                Adicione um novo serviço
            </DialogDescription>
          </DialogHeader>

        <Form {...form} >
            <form className="space-y-2" >
                
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
                                placeholder="Ex 120,00" />
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

                <Button type="submit" className="w-full font-semibold text-white ">
                     Adicionar serviço
                </Button>
                  

            </form>
        </Form>
        </>
    )
}