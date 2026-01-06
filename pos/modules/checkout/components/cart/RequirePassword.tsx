import { FormEvent, useState } from "react"
import { requirePasswordAtom, updateCartAtom } from "@/store/cart.store"
import { orderPasswordAtom } from "@/store/config.store"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const RequirePassword = () => {
  const orderPassword = useAtomValue(orderPasswordAtom)
  const [requirePassword, setRequirePassword] = useAtom(requirePasswordAtom)
  const changeCart = useSetAtom(updateCartAtom)
  const [value, setValue] = useState("")
  const [error, setError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (value === orderPassword && requirePassword?._id) {
      changeCart({ ...(requirePassword || {}), allowed: true })
      setRequirePassword(null)
      return setValue("")
    }
    setError(true)
  }

  return (
    <Dialog
      open={!!requirePassword}
      onOpenChange={(open) => !open && setRequirePassword(null)}
    >
      <DialogContent>
        <form className="space-y-1" onSubmit={handleSubmit}>
          <Label>Нууц үг</Label>
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10 cursor-pointer flex items-center justify-center"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <Button type="submit">Батлах</Button>
          </div>
          <div className={error ? "text-destructive" : "text-muted-foreground"}>
            Баталгаажуулах нууц {error && "зөв"} үгээ оруулана уу
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RequirePassword
